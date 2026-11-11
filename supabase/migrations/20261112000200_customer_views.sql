-- Invoices for the signed-in customer's marketplace bookings (sent or paid only; never drafts).
create function public.customer_invoices()
returns table (
  number int, status public.invoice_status, total_cents int, amount_paid_cents int, issue_date date, due_date date,
  token text, business_name text, request_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.number, i.status, i.total_cents, i.amount_paid_cents, i.issue_date, i.due_date, i.public_token, b.name, bk.request_id
  from public.bookings bk
  join public.invoices i on i.job_id = bk.job_id and i.status not in ('draft', 'void')
  join public.businesses b on b.id = bk.business_id
  where bk.customer_id = (select auth.uid())
  order by i.issue_date desc;
$$;
revoke execute on function public.customer_invoices() from public, anon;
grant execute on function public.customer_invoices() to authenticated, service_role;
