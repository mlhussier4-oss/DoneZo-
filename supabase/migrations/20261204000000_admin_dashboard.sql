-- Owner request 2026-11-14: a live bird's-eye admin dashboard and a "marketplace live" view of every job and bid.
-- Admin only (checked inside each function). Days are counted in Central time (the launch area).

create function public.admin_dashboard()
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
                  join public.plans p on p.id = b.plan_id where s.status in ('active', 'trialing', 'past_due')),
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

-- Every job with its bids (sealed bids are visible to the admin only), booking and customer first name.
create function public.admin_marketplace_live(p_status text default 'active', p_category uuid default null, p_zip text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(j order by j ->> 'created_at' desc) from (
      select jsonb_build_object(
        'id', r.id, 'status', r.status, 'zip', r.zip, 'description', left(r.description, 300), 'details', r.details,
        'timing', r.timing, 'created_at', r.created_at, 'expires_at', r.expires_at,
        'category', c.name, 'customer', public.customer_card(r.customer_id),
        'photos', (select count(*) from public.request_photos p where p.request_id = r.id),
        'bids', coalesce((select jsonb_agg(jsonb_build_object('business', b.name, 'price_cents', x.price_cents, 'status', x.status,
                                  'created_at', x.created_at, 'verified', b.verified_at is not null) order by x.price_cents)
                          from public.bids x join public.businesses b on b.id = x.business_id where x.request_id = r.id), '[]'::jsonb),
        'booking', (select jsonb_build_object('status', k.status, 'business', b.name, 'price_cents', k.agreed_price_cents,
                                               'confirm_by', k.confirm_by, 'completed_at', k.completed_at)
                    from public.bookings k join public.businesses b on b.id = k.business_id
                    where k.request_id = r.id and k.parent_booking_id is null order by k.created_at desc limit 1)
      ) j
      from public.service_requests r
      join public.service_categories c on c.id = r.category_id
      where (p_category is null or r.category_id = p_category)
        and (p_zip is null or r.zip like p_zip || '%')
        and case p_status
              when 'open' then r.status = 'open' and r.expires_at > now()
              when 'booked' then r.status = 'booked'
              when 'active' then (r.status = 'open' and r.expires_at > now()) or r.status = 'booked'
              else true end
      order by r.created_at desc
      limit 200
    ) t
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_dashboard(), public.admin_marketplace_live(text, uuid, text) from public, anon;
grant execute on function public.admin_dashboard(), public.admin_marketplace_live(text, uuid, text) to authenticated;
