-- Owner request 2026-11-22: a revenue box on the admin dashboard that updates live each time a provider pays a
-- subscription, with a chart filtered by today / 7 days / 30 days / year.
-- Every subscription payment Stripe confirms (platform `invoice.paid` with an amount above $0) is saved here once
-- (duplicate webhooks are ignored by the unique invoice id). Refunds are subtracted. Only admins can read it,
-- through admin_revenue(); there are no table policies, so no user can read the table directly.

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  stripe_invoice_id text not null unique,
  business_id uuid references public.businesses (id) on delete set null,
  plan_code text,
  amount_cents integer not null check (amount_cents > 0),
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  paid_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index subscription_payments_paid_at on public.subscription_payments (paid_at);
alter table public.subscription_payments enable row level security;
revoke all on public.subscription_payments from anon, authenticated;

-- Called by HomeHire's server (Stripe webhook) only.
create function public.record_subscription_payment(p_invoice_id text, p_business_id uuid, p_amount_cents integer, p_paid_at timestamptz)
returns void language sql security definer set search_path = '' as $$
  insert into public.subscription_payments (stripe_invoice_id, business_id, plan_code, amount_cents, paid_at)
  select p_invoice_id, p_business_id, (select p.code from public.businesses b join public.plans p on p.id = b.plan_id where b.id = p_business_id),
         p_amount_cents, coalesce(p_paid_at, now())
  where p_amount_cents > 0
  on conflict (stripe_invoice_id) do nothing;
$$;
revoke all on function public.record_subscription_payment(text, uuid, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.record_subscription_payment(text, uuid, integer, timestamptz) to service_role;

create function public.record_subscription_refund(p_invoice_id text, p_refunded_total_cents integer)
returns void language sql security definer set search_path = '' as $$
  update public.subscription_payments set refunded_cents = least(amount_cents, greatest(0, p_refunded_total_cents))
  where stripe_invoice_id = p_invoice_id;
$$;
revoke all on function public.record_subscription_refund(text, integer) from public, anon, authenticated;
grant execute on function public.record_subscription_refund(text, integer) to service_role;

-- Admin only: income for a period, in Central time. p_range: 'today' (by hour), '7d' and '30d' (by day), 'year' (by month).
-- Subscriptions are net of refunds; card fees are HomeHire's 10% of Stripe-verified card payments.
create function public.admin_revenue(p_range text default '30d')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_tz constant text := 'America/Chicago';
  v_now timestamp := (now() at time zone v_tz);
  v_step interval;
  v_first timestamp;
  v_count int;
  v_label text;
  v jsonb;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  case p_range
    when 'today' then v_step := interval '1 hour';  v_first := date_trunc('day', v_now);                          v_count := 24; v_label := 'FMHH12am';
    when '7d'    then v_step := interval '1 day';   v_first := date_trunc('day', v_now) - interval '6 days';     v_count := 7;  v_label := 'Dy Mon DD';
    when 'year'  then v_step := interval '1 month'; v_first := date_trunc('month', v_now) - interval '11 months'; v_count := 12; v_label := 'Mon YYYY';
    else              v_step := interval '1 day';   v_first := date_trunc('day', v_now) - interval '29 days';    v_count := 30; v_label := 'Mon DD'; p_range := '30d';
  end case;

  with buckets as (
    select i, v_first + v_step * i as b_start, v_first + v_step * (i + 1) as b_end
    from generate_series(0, v_count - 1) i
  ),
  subs as (
    select (s.paid_at at time zone v_tz) as t, s.amount_cents - s.refunded_cents as cents
    from public.subscription_payments s
    left join public.businesses b on b.id = s.business_id
    where not coalesce(b.is_review_account, false)
  ),
  fees as (
    select (pr.paid_at at time zone v_tz) as t, coalesce(pr.application_fee_cents, 0) as cents
    from public.payment_requests pr
    where pr.status = 'paid' and pr.paid_at is not null and not public.is_review_business(pr.business_id)
  ),
  rows as (
    select k.i, k.b_start,
      coalesce((select sum(cents) from subs where t >= k.b_start and t < k.b_end), 0)::bigint as subs_cents,
      coalesce((select count(*) from subs where t >= k.b_start and t < k.b_end), 0)::int as payments,
      coalesce((select sum(cents) from fees where t >= k.b_start and t < k.b_end), 0)::bigint as fees_cents
    from buckets k
  )
  select jsonb_build_object(
    'range', p_range,
    'buckets', (select jsonb_agg(jsonb_build_object(
        'label', trim(to_char(r.b_start, v_label)),
        'start', to_char(r.b_start, 'YYYY-MM-DD"T"HH24:MI:SS'),
        'subs_cents', r.subs_cents, 'payments', r.payments, 'fees_cents', r.fees_cents) order by r.i) from rows r),
    'subs_cents', (select coalesce(sum(subs_cents), 0) from rows),
    'payments', (select coalesce(sum(payments), 0) from rows),
    'fees_cents', (select coalesce(sum(fees_cents), 0) from rows),
    'recent', (select coalesce(jsonb_agg(x order by x ->> 'paid_at' desc), '[]'::jsonb) from (
        select jsonb_build_object('paid_at', s.paid_at, 'business', coalesce(b.name, 'Deleted business'),
               'plan', coalesce(p.name, initcap(s.plan_code)), 'amount_cents', s.amount_cents, 'refunded_cents', s.refunded_cents) x
        from public.subscription_payments s
        left join public.businesses b on b.id = s.business_id
        left join public.plans p on p.code = s.plan_code
        where not coalesce(b.is_review_account, false)
        order by s.paid_at desc limit 10) q)
  ) into v;
  return v;
end;
$$;
revoke all on function public.admin_revenue(text) from public, anon;
grant execute on function public.admin_revenue(text) to authenticated;
