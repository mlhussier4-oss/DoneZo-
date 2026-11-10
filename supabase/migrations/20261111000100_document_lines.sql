-- Replace all line items of an invoice or estimate in one all-or-nothing step.
-- SECURITY INVOKER: Row Level Security and the "can this still be edited?" triggers apply as usual.
create function public.replace_document_lines(p_kind text, p_document_id uuid, p_lines jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_business uuid;
begin
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 or jsonb_array_length(p_lines) > 200 then
    raise exception 'Add between 1 and 200 lines' using errcode = 'P0001';
  end if;

  if p_kind = 'invoice' then
    select business_id into v_business from public.invoices where id = p_document_id;
    if v_business is null then raise exception 'Not allowed' using errcode = '42501'; end if;
    delete from public.invoice_line_items where invoice_id = p_document_id;
    insert into public.invoice_line_items (business_id, invoice_id, position, description, quantity, unit_price_cents, taxable)
    select v_business, p_document_id, (l ->> 'position')::int, l ->> 'description', (l ->> 'quantity')::numeric,
           (l ->> 'unit_price_cents')::int, coalesce((l ->> 'taxable')::boolean, true)
    from jsonb_array_elements(p_lines) l;
  elsif p_kind = 'estimate' then
    select business_id into v_business from public.estimates where id = p_document_id;
    if v_business is null then raise exception 'Not allowed' using errcode = '42501'; end if;
    delete from public.estimate_line_items where estimate_id = p_document_id;
    insert into public.estimate_line_items (business_id, estimate_id, position, description, quantity, unit_price_cents, taxable)
    select v_business, p_document_id, (l ->> 'position')::int, l ->> 'description', (l ->> 'quantity')::numeric,
           (l ->> 'unit_price_cents')::int, coalesce((l ->> 'taxable')::boolean, true)
    from jsonb_array_elements(p_lines) l;
  else
    raise exception 'Unknown document kind';
  end if;
end;
$$;

revoke execute on function public.replace_document_lines(text, uuid, jsonb) from public, anon;
grant execute on function public.replace_document_lines(text, uuid, jsonb) to authenticated, service_role;

-- Numbers are assigned by the before-insert triggers; the default only lets inserts omit the column.
alter table public.invoices alter column number set default 0;
alter table public.estimates alter column number set default 0;
