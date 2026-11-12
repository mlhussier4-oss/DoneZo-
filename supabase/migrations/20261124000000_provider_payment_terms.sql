-- Owner request 2026-11-12: providers must accept the Provider Payment Terms (they collect payment from their
-- own customers; DoneZo only offers card processing through Stripe and never guarantees payment).
-- Acceptance is recorded per business: who accepted, when, and which version.
alter table public.businesses
  add column payment_terms_version text,
  add column payment_terms_accepted_at timestamptz,
  add column payment_terms_accepted_by uuid references public.profiles (id) on delete set null;

-- Sign-up: the new owner ticked "I agree" (sent as user metadata), so record it when the business is created.
create function public.record_signup_payment_terms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version text;
begin
  if new.created_by is not null then
    select nullif(left(u.raw_user_meta_data ->> 'payment_terms_version', 20), '') into v_version
    from auth.users u where u.id = new.created_by;
    if v_version is not null then
      new.payment_terms_version := v_version;
      new.payment_terms_accepted_at := now();
      new.payment_terms_accepted_by := new.created_by;
    end if;
  end if;
  return new;
end;
$$;
create trigger businesses_signup_payment_terms before insert on public.businesses
  for each row execute function public.record_signup_payment_terms();
revoke all on function public.record_signup_payment_terms() from public, anon, authenticated;

-- Existing businesses: the owner accepts once (the app asks before they continue).
create function public.accept_payment_terms(p_business_id uuid, p_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.business_members
                 where business_id = p_business_id and user_id = auth.uid() and role = 'owner') then
    raise exception 'Only the business owner can accept these terms.' using errcode = '42501';
  end if;
  if p_version is null or length(p_version) > 20 then raise exception 'Invalid version' using errcode = 'P0001'; end if;
  update public.businesses
  set payment_terms_version = p_version, payment_terms_accepted_at = now(), payment_terms_accepted_by = auth.uid()
  where id = p_business_id;
end;
$$;
revoke all on function public.accept_payment_terms(uuid, text) from public, anon;
grant execute on function public.accept_payment_terms(uuid, text) to authenticated;
