-- Owner decision 2026-11-15: new providers get their first month free (30-day Stripe trial, card collected at sign-up,
-- no reminder before the first charge; the price after the free month is shown clearly at sign-up and checkout).
-- Referrals already count only on the first real (non-zero) payment, i.e. after the free month.
-- Dashboard: monthly subscription income counts paying providers only; providers in their free month are shown separately.
create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text := 'America/Chicago';
  v_today date := (now() at time zone 'America/Chicago')::date;
  v jsonb;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  select jsonb_build_object(
    'customers', (select count(*) from public.profiles where role = 'customer' and email is not null),
    'customers_7d', (select count(*) from public.profiles where role = 'customer' and email is not null and created_at > now() - interval '7 days'),
    'providers', (select count(*) from public.businesses),
    'providers_7d', (select count(*) from public.businesses where created_at > now() - interval '7 days'),
    'subscribed', (select count(*) from public.business_subscriptions where status in ('active', 'trialing', 'past_due')),
    'subscribed_basic', (select count(*) from public.business_subscriptions s join public.businesses b on b.id = s.business_id join public.plans p on p.id = b.plan_id
                         where s.status in ('active', 'trialing', 'past_due') and p.code = 'basic'),
    'subscribed_pro', (select count(*) from public.business_subscriptions s join public.businesses b on b.id = s.business_id join public.plans p on p.id = b.plan_id
                       where s.status in ('active', 'trialing', 'past_due') and p.code <> 'basic'),
    'mrr_cents', (select coalesce(sum(p.price_cents), 0) from public.business_subscriptions s join public.businesses b on b.id = s.business_id
                  join public.plans p on p.id = b.plan_id where s.status in ('active', 'past_due')),
    'in_free_month', (select count(*) from public.business_subscriptions where status = 'trialing'),
    'jobs_today', (select count(*) from public.service_requests where (created_at at time zone v_tz)::date = v_today),
    'jobs_7d', (select count(*) from public.service_requests where created_at > now() - interval '7 days'),
    'jobs_total', (select count(*) from public.service_requests),
    'jobs_open', (select count(*) from public.service_requests where status = 'open' and expires_at > now()),
    'bids_today', (select count(*) from public.bids where (created_at at time zone v_tz)::date = v_today),
    'bids_7d', (select count(*) from public.bids where created_at > now() - interval '7 days'),
    'waiting_confirm', (select count(*) from public.bookings where status = 'pending'),
    'in_progress', (select count(*) from public.bookings where status = 'active'),
    'completed_total', (select count(*) from public.bookings where status = 'completed'),
    'completed_7d', (select count(*) from public.bookings where status = 'completed' and completed_at > now() - interval '7 days'),
    'card_volume_30d_cents', (select coalesce(sum(amount_cents), 0) from public.payment_requests where status = 'paid' and paid_at > now() - interval '30 days'),
    'card_fees_30d_cents', (select coalesce(sum(application_fee_cents), 0) from public.payment_requests where status = 'paid' and paid_at > now() - interval '30 days'),
    'open_reports', (select count(*) from public.support_reports where status = 'open'),
    'daily', (
      select jsonb_agg(jsonb_build_object(
        'day', d,
        'jobs', (select count(*) from public.service_requests r where (r.created_at at time zone v_tz)::date = d),
        'customers', (select count(*) from public.profiles p where p.role = 'customer' and p.email is not null and (p.created_at at time zone v_tz)::date = d),
        'providers', (select count(*) from public.businesses b where (b.created_at at time zone v_tz)::date = d),
        'completed', (select count(*) from public.bookings k where k.status = 'completed' and (k.completed_at at time zone v_tz)::date = d)
      ) order by d)
      from generate_series(v_today - 29, v_today, interval '1 day') as g(d0), lateral (select g.d0::date as d) x
    ),
    'by_service', (
      select coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'jobs', n) order by n desc), '[]'::jsonb) from (
        select r.category_id, count(*) n from public.service_requests r where r.created_at > now() - interval '30 days' group by 1
      ) t join public.service_categories c on c.id = t.category_id
    ),
    'activity', (
      select coalesce(jsonb_agg(a order by a ->> 'at' desc), '[]'::jsonb) from (
        (select jsonb_build_object('at', created_at, 'kind', 'customer', 'text', 'New customer: ' || coalesce(full_name, 'Customer')) a
         from public.profiles where role = 'customer' and email is not null order by created_at desc limit 8)
        union all
        (select jsonb_build_object('at', created_at, 'kind', 'provider', 'text', 'New provider: ' || name) from public.businesses order by created_at desc limit 8)
        union all
        (select jsonb_build_object('at', r.created_at, 'kind', 'job', 'text', 'Job posted: ' || c.name || ' in ' || r.zip)
         from public.service_requests r join public.service_categories c on c.id = r.category_id order by r.created_at desc limit 8)
        union all
        (select jsonb_build_object('at', x.created_at, 'kind', 'bid', 'text', b.name || ' bid $' || to_char(x.price_cents / 100.0, 'FM999,990.00') || ' on ' || c.name)
         from public.bids x join public.businesses b on b.id = x.business_id join public.service_requests r on r.id = x.request_id
         join public.service_categories c on c.id = r.category_id order by x.created_at desc limit 8)
        union all
        (select jsonb_build_object('at', k.completed_at, 'kind', 'done', 'text', 'Job completed by ' || b.name || ': $' || to_char(k.agreed_price_cents / 100.0, 'FM999,990.00'))
         from public.bookings k join public.businesses b on b.id = k.business_id where k.status = 'completed' order by k.completed_at desc limit 8)
      ) s limit 25
    )
  ) into v;
  return v;
end;
$$;

