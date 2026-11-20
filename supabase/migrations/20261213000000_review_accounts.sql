-- Owner request 2026-11-20: test accounts for Apple / Google app reviewers.
-- Apple requires a working login for its reviewers. These accounts are clearly labeled, live in their own
-- "review world" (review customers' jobs are seen only by review providers, and the other way round), and are
-- left out of the admin dashboard numbers, so real customers and providers never see them and the owner's stats
-- stay accurate. Only the service role (scripts/review-accounts.mjs) can set the flag: it isn't in the column
-- grants that let users edit their own profile or business.

alter table public.profiles add column is_review_account boolean not null default false;
alter table public.businesses add column is_review_account boolean not null default false;

create function public.is_review_business(p_business_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select b.is_review_account from public.businesses b where b.id = p_business_id), false);
$$;

create function public.is_review_request(p_request_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_review_account from public.service_requests r join public.profiles p on p.id = r.customer_id
                   where r.id = p_request_id), false);
$$;

revoke all on function public.is_review_business(uuid) from public, anon, authenticated;
revoke all on function public.is_review_request(uuid) from public, anon, authenticated;

-- Providers only see jobs from the same world (real ↔ real, review ↔ review).
create or replace function public.business_can_see_request(p_request_id uuid, p_business_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.service_requests r
    join public.businesses b on b.id = p_business_id
    where r.id = p_request_id
      and b.marketplace_enabled and not b.is_suspended and b.home_zip is not null
      and public.business_has_access(b.id)
      and b.is_review_account = public.is_review_request(r.id)
      and (
        exists (select 1 from public.bids x where x.request_id = r.id and x.business_id = b.id)
        or (
          r.status = 'open' and r.expires_at > now()
          and exists (select 1 from public.provider_categories pc where pc.business_id = b.id and pc.category_id = r.category_id)
          and public.miles_between_zips(b.home_zip, r.zip) <= b.service_radius_miles
        )
      )
  );
$$;

-- "New job near you" alerts follow the same rule.
create or replace function public.notify_new_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_category text;
  v_review boolean := coalesce((select p.is_review_account from public.profiles p where p.id = new.customer_id), false);
  b record;
begin
  select name into v_category from public.service_categories where id = new.category_id;
  for b in
    select bz.id from public.businesses bz
    join public.provider_categories pc on pc.business_id = bz.id and pc.category_id = new.category_id
    where bz.marketplace_enabled and not bz.is_suspended and bz.home_zip is not null
      and bz.is_review_account = v_review
      and public.business_has_access(bz.id)
      and public.miles_between_zips(bz.home_zip, new.zip) <= bz.service_radius_miles
  loop
    perform public.notify_business(b.id, 'new_request', 'New ' || lower(v_category) || ' job near you',
      'ZIP ' || new.zip || '. Take a look and send a bid.', '/provider/marketplace/requests/' || new.id);
  end loop;
  return null;
end;
$$;

-- Admin "Marketplace live" leaves out review jobs.
create or replace function public.admin_marketplace_live(p_status text DEFAULT 'active'::text, p_category uuid DEFAULT NULL::uuid, p_zip text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      where not public.is_review_request(r.id)
        and (p_category is null or r.category_id = p_category)
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
$function$;

-- Admin dashboard numbers leave out review accounts and their jobs, bids, bookings and payments.
create or replace function public.admin_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tz text := 'America/Chicago';
  v_today date := (now() at time zone 'America/Chicago')::date;
  v jsonb;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  select jsonb_build_object(
    'customers', (select count(*) from public.profiles where role = 'customer' and email is not null and not is_review_account),
    'customers_7d', (select count(*) from public.profiles where role = 'customer' and email is not null and not is_review_account and created_at > now() - interval '7 days'),
    'providers', (select count(*) from public.businesses where not is_review_account),
    'providers_7d', (select count(*) from public.businesses where not is_review_account and created_at > now() - interval '7 days'),
    'subscribed', (select count(*) from public.business_subscriptions where not public.is_review_business(business_id) and status in ('active', 'trialing', 'past_due')),
    'subscribed_basic', (select count(*) from public.business_subscriptions s join public.businesses b on b.id = s.business_id and not b.is_review_account join public.plans p on p.id = b.plan_id
                         where s.status in ('active', 'trialing', 'past_due') and p.code = 'basic'),
    'subscribed_pro', (select count(*) from public.business_subscriptions s join public.businesses b on b.id = s.business_id and not b.is_review_account join public.plans p on p.id = b.plan_id
                       where s.status in ('active', 'trialing', 'past_due') and p.code <> 'basic'),
    'mrr_cents', (select coalesce(sum(p.price_cents), 0) from public.business_subscriptions s join public.businesses b on b.id = s.business_id and not b.is_review_account
                  join public.plans p on p.id = b.plan_id where s.status in ('active', 'past_due')),
    'in_free_month', (select count(*) from public.business_subscriptions where not public.is_review_business(business_id) and status = 'trialing'),
    'jobs_today', (select count(*) from public.service_requests where not public.is_review_request(id) and (created_at at time zone v_tz)::date = v_today),
    'jobs_7d', (select count(*) from public.service_requests where not public.is_review_request(id) and created_at > now() - interval '7 days'),
    'jobs_total', (select count(*) from public.service_requests where not public.is_review_request(id)),
    'jobs_open', (select count(*) from public.service_requests where not public.is_review_request(id) and status = 'open' and expires_at > now()),
    'bids_today', (select count(*) from public.bids where not public.is_review_business(business_id) and (created_at at time zone v_tz)::date = v_today),
    'bids_7d', (select count(*) from public.bids where not public.is_review_business(business_id) and created_at > now() - interval '7 days'),
    'waiting_confirm', (select count(*) from public.bookings where not public.is_review_business(business_id) and status = 'pending'),
    'in_progress', (select count(*) from public.bookings where not public.is_review_business(business_id) and status = 'active'),
    'completed_total', (select count(*) from public.bookings where not public.is_review_business(business_id) and status = 'completed'),
    'completed_7d', (select count(*) from public.bookings where not public.is_review_business(business_id) and status = 'completed' and completed_at > now() - interval '7 days'),
    'card_volume_30d_cents', (select coalesce(sum(amount_cents), 0) from public.payment_requests where not public.is_review_business(business_id) and status = 'paid' and paid_at > now() - interval '30 days'),
    'card_fees_30d_cents', (select coalesce(sum(application_fee_cents), 0) from public.payment_requests where not public.is_review_business(business_id) and status = 'paid' and paid_at > now() - interval '30 days'),
    'open_reports', (select count(*) from public.support_reports where status = 'open'),
    'daily', (
      select jsonb_agg(jsonb_build_object(
        'day', d,
        'jobs', (select count(*) from public.service_requests r where not public.is_review_request(r.id) and (r.created_at at time zone v_tz)::date = d),
        'customers', (select count(*) from public.profiles p where p.role = 'customer' and p.email is not null and not p.is_review_account and (p.created_at at time zone v_tz)::date = d),
        'providers', (select count(*) from public.businesses b where not b.is_review_account and (b.created_at at time zone v_tz)::date = d),
        'completed', (select count(*) from public.bookings k where not public.is_review_business(k.business_id) and k.status = 'completed' and (k.completed_at at time zone v_tz)::date = d)
      ) order by d)
      from generate_series(v_today - 29, v_today, interval '1 day') as g(d0), lateral (select g.d0::date as d) x
    ),
    'by_service', (
      select coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'jobs', n) order by n desc), '[]'::jsonb) from (
        select r.category_id, count(*) n from public.service_requests r where not public.is_review_request(r.id) and r.created_at > now() - interval '30 days' group by 1
      ) t join public.service_categories c on c.id = t.category_id
    ),
    'activity', (
      select coalesce(jsonb_agg(a order by a ->> 'at' desc), '[]'::jsonb) from (
        (select jsonb_build_object('at', created_at, 'kind', 'customer', 'text', 'New customer: ' || coalesce(full_name, 'Customer')) a
         from public.profiles where role = 'customer' and email is not null and not is_review_account order by created_at desc limit 8)
        union all
        (select jsonb_build_object('at', created_at, 'kind', 'provider', 'text', 'New provider: ' || name) from public.businesses where not is_review_account order by created_at desc limit 8)
        union all
        (select jsonb_build_object('at', r.created_at, 'kind', 'job', 'text', 'Job posted: ' || c.name || ' in ' || r.zip)
         from public.service_requests r join public.service_categories c on c.id = r.category_id where not public.is_review_request(r.id) order by r.created_at desc limit 8)
        union all
        (select jsonb_build_object('at', x.created_at, 'kind', 'bid', 'text', b.name || ' bid $' || to_char(x.price_cents / 100.0, 'FM999,990.00') || ' on ' || c.name)
         from public.bids x join public.businesses b on b.id = x.business_id and not b.is_review_account join public.service_requests r on r.id = x.request_id
         join public.service_categories c on c.id = r.category_id order by x.created_at desc limit 8)
        union all
        (select jsonb_build_object('at', k.completed_at, 'kind', 'done', 'text', 'Job completed by ' || b.name || ': $' || to_char(k.agreed_price_cents / 100.0, 'FM999,990.00'))
         from public.bookings k join public.businesses b on b.id = k.business_id and not b.is_review_account where k.status = 'completed' order by k.completed_at desc limit 8)
      ) s limit 25
    )
  ) into v;
  return v;
end;
$function$;
