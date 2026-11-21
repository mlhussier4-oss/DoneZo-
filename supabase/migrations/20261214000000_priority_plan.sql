-- Owner decision 2026-11-21: a third plan, HomeHire Priority ($39.99/month, monthly only, no free month).
-- Everything in Pro, plus a 5-minute head start on new marketplace jobs: when a job is posted, Priority pros who
-- serve it see it (and can bid) 5 minutes before everyone else, so their bids are the first the customer sees.
-- If no Priority pro serves the job, there is no wait: everyone sees it right away. Customers see no label.

insert into public.plans (code, name, description, is_default, is_active, sort_order, price_cents, stripe_lookup_key, stripe_yearly_lookup_key)
values ('priority', 'HomeHire Priority', 'Everything in Pro, plus a 5-minute head start on new jobs. $39.99 per month.', false, true, 3, 3999, 'donezo_priority_monthly', null)
on conflict (code) do nothing;

-- Same features as Pro, plus priority_access.
insert into public.plan_features (plan_id, feature_key, enabled, limit_value)
select (select id from public.plans where code = 'priority'), f.feature_key, f.enabled, f.limit_value
from public.plan_features f where f.plan_id = (select id from public.plans where code = 'pro')
on conflict do nothing;
insert into public.plan_features (plan_id, feature_key, enabled)
values ((select id from public.plans where code = 'priority'), 'priority_access', true)
on conflict do nothing;

-- Sign-up may choose Priority too.
create or replace function public.signup_plan_id(p_meta jsonb)
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select id from public.plans where code = p_meta ->> 'plan' and code in ('basic', 'pro', 'priority') and is_active),
    (select id from public.plans where is_default and is_active limit 1));
$$;

create or replace function public.business_is_priority(p_business_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.businesses b
    join public.plan_features f on f.plan_id = b.plan_id and f.feature_key = 'priority_access' and f.enabled
    where b.id = p_business_id
  );
$$;
revoke all on function public.business_is_priority(uuid) from public, anon, authenticated;

-- Businesses a new job is offered to: marketplace on, not removed, paid up, same "review world", offering the
-- service, within their travel radius.
create function public.request_eligible_businesses(p_category uuid, p_zip text, p_review boolean)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select bz.id from public.businesses bz
  join public.provider_categories pc on pc.business_id = bz.id and pc.category_id = p_category
  where bz.marketplace_enabled and not bz.is_suspended and bz.home_zip is not null
    and bz.is_review_account = p_review
    and public.business_has_access(bz.id)
    and public.miles_between_zips(bz.home_zip, p_zip) <= bz.service_radius_miles;
$$;
revoke all on function public.request_eligible_businesses(uuid, text, boolean) from public, anon, authenticated;

-- When the head start ends (null = no head start because no Priority pro serves this job), whether everyone else
-- has been alerted, and the pro a "Book again" customer invited (they skip the head start).
alter table public.service_requests
  add column head_start_until timestamptz,
  add column others_notified_at timestamptz,
  add column invited_business_id uuid references public.businesses (id) on delete set null;

create function public.service_requests_head_start()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_review boolean := coalesce((select p.is_review_account from public.profiles p where p.id = new.customer_id), false);
begin
  new.head_start_until := null;
  new.others_notified_at := null;
  new.invited_business_id := null;
  if exists (select 1 from public.request_eligible_businesses(new.category_id, new.zip, v_review) e(id) where public.business_is_priority(e.id)) then
    new.head_start_until := now() + interval '5 minutes';
  end if;
  return new;
end;
$$;
revoke all on function public.service_requests_head_start() from public, anon, authenticated;
create trigger service_requests_head_start before insert on public.service_requests
  for each row execute function public.service_requests_head_start();

-- Customers can't set these themselves.
create function public.service_requests_head_start_locked()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
     and (new.head_start_until is distinct from old.head_start_until or new.others_notified_at is distinct from old.others_notified_at
          or new.invited_business_id is distinct from old.invited_business_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.service_requests_head_start_locked() from public, anon, authenticated;
create trigger service_requests_head_start_locked before update on public.service_requests
  for each row execute function public.service_requests_head_start_locked();

-- Job board visibility: during the head start, only Priority pros (and a Book-again invitee) see a new job.
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
          and (r.head_start_until is null or r.head_start_until <= now() or r.invited_business_id = b.id or public.business_is_priority(b.id))
        )
      )
  );
$$;

-- "New job near you" alerts: Priority pros right away (with the head-start nudge); everyone else when it ends.
create or replace function public.notify_new_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_category text;
  v_review boolean := coalesce((select p.is_review_account from public.profiles p where p.id = new.customer_id), false);
  v_priority boolean;
  b uuid;
begin
  select name into v_category from public.service_categories where id = new.category_id;
  for b in select * from public.request_eligible_businesses(new.category_id, new.zip, v_review) loop
    v_priority := public.business_is_priority(b);
    if new.head_start_until is null then
      perform public.notify_business(b, 'new_request', 'New ' || lower(v_category) || ' job near you',
        'ZIP ' || new.zip || '. Take a look and send a bid.', '/provider/marketplace/requests/' || new.id);
    elsif v_priority then
      perform public.notify_business(b, 'new_request', 'New ' || lower(v_category) || ' job near you',
        'You have a 5-minute head start on your bid! ZIP ' || new.zip || '.', '/provider/marketplace/requests/' || new.id);
    end if;
  end loop;
  return null;
end;
$$;

-- Runs every minute: alert everyone else once a head start ends.
create function public.notify_after_head_start()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  r record;
  b uuid;
  v_review boolean;
  v_count integer := 0;
begin
  for r in
    select sr.id, sr.category_id, sr.zip, sr.customer_id, sr.invited_business_id, c.name as category
    from public.service_requests sr join public.service_categories c on c.id = sr.category_id
    where sr.head_start_until is not null and sr.head_start_until <= now() and sr.others_notified_at is null
    for update of sr skip locked
  loop
    update public.service_requests set others_notified_at = now() where id = r.id;
    if (select status from public.service_requests where id = r.id) = 'open' then
      v_review := coalesce((select p.is_review_account from public.profiles p where p.id = r.customer_id), false);
      for b in select * from public.request_eligible_businesses(r.category_id, r.zip, v_review) loop
        if not public.business_is_priority(b) and b is distinct from r.invited_business_id then
          perform public.notify_business(b, 'new_request', 'New ' || lower(r.category) || ' job near you',
            'ZIP ' || r.zip || '. Take a look and send a bid.', '/provider/marketplace/requests/' || r.id);
        end if;
      end loop;
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.notify_after_head_start() from public, anon, authenticated;
grant execute on function public.notify_after_head_start() to service_role;
select cron.schedule('notify-after-head-start', '* * * * *', 'select public.notify_after_head_start()');

-- Book again: the invited pro can see and bid on the job right away, head start or not.
create or replace function public.invite_past_provider(p_new_request uuid, p_past_request uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_business uuid;
  v_new public.service_requests;
  v_category text;
begin
  select * into v_new from public.service_requests where id = p_new_request and customer_id = auth.uid();
  if v_new.id is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  select k.business_id into v_business from public.bookings k
  where k.request_id = p_past_request and k.customer_id = auth.uid() and k.status = 'completed' and k.parent_booking_id is null
  order by k.completed_at desc limit 1;
  if v_business is null then return false; end if;
  update public.service_requests set invited_business_id = v_business where id = v_new.id;
  if not public.business_can_see_request(v_new.id, v_business) then
    update public.service_requests set invited_business_id = null where id = v_new.id;
    return false;
  end if;
  select name into v_category from public.service_categories where id = v_new.category_id;
  perform public.notify_business(v_business, 'book_again',
    (public.customer_card(auth.uid()) ->> 'first_name') || ' wants to book you again',
    'A past customer posted a new ' || lower(v_category) || ' job and asked for you. Send your bid.',
    '/provider/marketplace/requests/' || v_new.id);
  return true;
end;
$$;

-- Job board: tell Priority pros how long their head start lasts (new column, so the function is recreated).
drop function public.marketplace_feed();
create function public.marketplace_feed()
returns table (id uuid, category_name text, category_icon text, description text, details jsonb, timing public.request_timing,
  preferred_date date, zip text, miles numeric, created_at timestamptz, expires_at timestamptz, photo_count integer,
  my_bid_status public.bid_status, my_bid_cents integer, customer jsonb, head_start_until timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, c.name, c.icon, r.description, r.details, r.timing, r.preferred_date, r.zip,
         round(public.miles_between_zips(b.home_zip, r.zip)::numeric, 1), r.created_at, r.expires_at,
         (select count(*)::int from public.request_photos p where p.request_id = r.id),
         x.status, x.price_cents, public.customer_card(r.customer_id),
         case when r.head_start_until > now() then r.head_start_until end
  from public.business_members m
  join public.businesses b on b.id = m.business_id
  join public.service_requests r on public.business_can_see_request(r.id, b.id)
  join public.service_categories c on c.id = r.category_id
  left join public.bids x on x.request_id = r.id and x.business_id = b.id
  where m.user_id = (select auth.uid()) and m.role in ('owner', 'manager')
  order by r.created_at desc
  limit 300;
$$;
revoke all on function public.marketplace_feed() from public, anon;
grant execute on function public.marketplace_feed() to authenticated;

-- Job page: the head start countdown for Priority pros.
create or replace function public.marketplace_request_detail(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'id', r.id, 'status', r.status, 'category_name', c.name, 'category_icon', c.icon,
    'description', r.description, 'details', r.details, 'timing', r.timing, 'preferred_date', r.preferred_date,
    'zip', r.zip, 'miles', round(public.miles_between_zips(b.home_zip, r.zip)::numeric, 1),
    'created_at', r.created_at, 'expires_at', r.expires_at,
    'photos', coalesce((select jsonb_agg(p.storage_path order by p.created_at) from public.request_photos p where p.request_id = r.id), '[]'::jsonb),
    'business_id', b.id,
    'customer', public.customer_card(r.customer_id),
    'head_start_until', case when r.head_start_until > now() and r.status = 'open' then r.head_start_until end
  )
  from public.business_members m
  join public.businesses b on b.id = m.business_id
  join public.service_requests r on r.id = p_request_id
  join public.service_categories c on c.id = r.category_id
  where m.user_id = (select auth.uid()) and m.role in ('owner', 'manager') and public.business_can_see_request(r.id, b.id)
  limit 1;
$function$;

-- Admin dashboard: Priority subscribers counted on their own.
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
                       where s.status in ('active', 'trialing', 'past_due') and p.code = 'pro'),
    'subscribed_priority', (select count(*) from public.business_subscriptions s join public.businesses b on b.id = s.business_id and not b.is_review_account join public.plans p on p.id = b.plan_id
                       where s.status in ('active', 'trialing', 'past_due') and p.code = 'priority'),
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
