-- Owner decision 2026-11-12: fast posting and live booking.
--  * Customer picks a bid -> booking is PENDING; the provider has 5 minutes to confirm with an arrival time.
--  * From 2:00 left the customer can add 10 minutes (repeatable) or drop the provider.
--  * Time runs out or the customer drops them -> booking LAPSED, the other bids are still there to pick.
--  * The customer's full address reaches the provider only when they confirm (customer records are created then).
--  * Chat opens only once the provider confirms (owner decision 2026-11-12), so nothing the customer shares can
--    reach a provider who then lets the time run out. A lapsed provider can no longer read or send messages.

alter table public.bookings
  add column confirm_by   timestamptz,
  add column confirmed_at timestamptz,
  add column arrival_at   timestamptz,
  add column extensions   int not null default 0 check (extensions between 0 and 50);

-- A job can now have earlier, lapsed bookings; only one live one at a time.
alter table public.bookings drop constraint bookings_request_id_key;
create unique index bookings_one_live_per_request on public.bookings (request_id) where status in ('pending', 'active', 'completed');
create index bookings_pending_idx on public.bookings (confirm_by) where status = 'pending';

-- Shared: end a pending booking (time ran out, or the customer dropped the provider).
create function public.lapse_booking(p_booking_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.bookings;
  v_req public.service_requests;
  v_category text;
begin
  update public.bookings set status = 'lapsed', canceled_at = now(), cancel_reason = p_reason
  where id = p_booking_id and status = 'pending' returning * into v;
  if v.id is null then return; end if;
  update public.bids set status = 'lapsed' where id = v.bid_id;
  select * into v_req from public.service_requests where id = v.request_id;
  select name into v_category from public.service_categories where id = v_req.category_id;
  update public.service_requests set status = case when expires_at > now() then 'open'::public.request_status else 'expired'::public.request_status end
  where id = v.request_id and status = 'pending';
  perform public.notify_business(v.business_id, 'booking_lapsed', 'You lost a job',
    case when p_reason = 'dropped' then 'The customer chose to move on from your bid for ' || v_category || '.'
         else 'The ' || v_category || ' job wasn''t confirmed in time, so the customer can choose another bid.' end,
    '/provider/marketplace?tab=bids');
  perform public.notify(v.customer_id, 'booking_lapsed',
    case when p_reason = 'dropped' then 'Provider removed' else 'Your provider didn''t confirm in time' end,
    'Choose another bid for your ' || v_category || ' job.', '/customer');
end;
$$;
revoke all on function public.lapse_booking(uuid, text) from public, anon, authenticated;

-- Customer picks a bid: start the 5-minute confirmation window.
create or replace function public.accept_bid(p_bid_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bid public.bids;
  v_req public.service_requests;
  v_category text;
  v_scope text;
  v_booking public.bookings;
begin
  select * into v_bid from public.bids where id = p_bid_id for update;
  if v_bid.id is null then raise exception 'Bid not found' using errcode = 'P0001'; end if;
  select * into v_req from public.service_requests where id = v_bid.request_id for update;
  if v_req.customer_id <> auth.uid() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if v_req.status = 'pending' then raise exception 'You''re waiting for a provider to confirm. Drop them first to choose another bid.' using errcode = 'P0001'; end if;
  if v_req.status <> 'open' or v_req.expires_at < now() then raise exception 'This job has already been booked or closed' using errcode = 'P0001'; end if;
  if v_bid.status <> 'submitted' then raise exception 'This bid is no longer available' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.businesses where id = v_bid.business_id and marketplace_enabled and not is_suspended) then
    raise exception 'This provider is not taking marketplace jobs right now' using errcode = 'P0001';
  end if;
  select name into v_category from public.service_categories where id = v_req.category_id;

  v_scope := 'Included: ' || v_bid.included
    || coalesce(E'\nNot included: ' || nullif(v_bid.exclusions, ''), '')
    || coalesce(E'\nPossible extra charges: ' || nullif(v_bid.additional_charges, ''), '')
    || E'\nAvailability: ' || v_bid.availability;

  insert into public.bookings (request_id, bid_id, business_id, customer_id, agreed_price_cents, original_price_cents, scope, status, confirm_by)
  values (v_req.id, v_bid.id, v_bid.business_id, v_req.customer_id, v_bid.price_cents, v_bid.price_cents, v_scope, 'pending', now() + interval '5 minutes')
  returning * into v_booking;
  update public.bids set status = 'accepted' where id = v_bid.id;
  update public.service_requests set status = 'pending' where id = v_req.id;

  perform public.notify_business(v_bid.business_id, 'booking_pending', 'You were chosen! Confirm within 5 minutes',
    v_category || ' in ' || v_req.zip || ' for $' || to_char(v_bid.price_cents / 100.0, 'FM999,999,990.00') || '. Confirm with your arrival time, or you lose the job.',
    '/provider/marketplace/bookings/' || v_booking.id);
  return v_booking;
end;
$$;

-- Provider confirms with an arrival time: the booking becomes active and the customer's details reach the provider.
create function public.confirm_booking(p_booking_id uuid, p_arrival_at timestamptz)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.bookings;
  v_req public.service_requests;
  v_loc public.service_request_locations;
  v_profile public.profiles;
  v_category text;
  v_business_name text;
  v_tz text;
  v_crm uuid;
  v_address uuid;
  v_job uuid;
  r record;
begin
  select * into v from public.bookings where id = p_booking_id for update;
  if v.id is null or not public.is_business_member(v.business_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if v.status <> 'pending' then raise exception 'This job is no longer waiting for you.' using errcode = 'P0001'; end if;
  if v.confirm_by < now() then
    -- Too late: record the lapse and return it (raising an error would undo the lapse).
    perform public.lapse_booking(v.id, 'timeout');
    select * into v from public.bookings where id = p_booking_id;
    return v;
  end if;
  if p_arrival_at is null or p_arrival_at < now() - interval '30 minutes' or p_arrival_at > now() + interval '60 days' then
    raise exception 'Choose an arrival time from now on.' using errcode = 'P0001';
  end if;

  select * into v_req from public.service_requests where id = v.request_id;
  select * into v_loc from public.service_request_locations where request_id = v_req.id;
  select * into v_profile from public.profiles where id = v_req.customer_id;
  select name into v_category from public.service_categories where id = v_req.category_id;
  select name, timezone into v_business_name, v_tz from public.businesses where id = v.business_id;

  -- Marketplace bookings create the customer and job for the provider on any plan (Basic included).
  perform set_config('donezo.system_write', 'on', true);
  select id into v_crm from public.crm_customers where business_id = v.business_id and profile_id = v_req.customer_id;
  if v_crm is null then
    insert into public.crm_customers (business_id, full_name, email, phone, source, profile_id)
    values (v.business_id, coalesce(nullif(v_profile.full_name, ''), 'DoneZo customer'), v_profile.email,
            coalesce(v_loc.phone, v_profile.phone), 'marketplace', v_req.customer_id)
    returning id into v_crm;
  else
    update public.crm_customers set is_archived = false, phone = coalesce(phone, v_loc.phone, v_profile.phone) where id = v_crm;
  end if;
  if v_loc.request_id is not null then
    insert into public.crm_customer_addresses (business_id, customer_id, line1, line2, city, state, postal_code, is_primary)
    values (v.business_id, v_crm, v_loc.line1, v_loc.line2, v_loc.city, v_loc.state, v_req.zip,
            not exists (select 1 from public.crm_customer_addresses where customer_id = v_crm))
    returning id into v_address;
  end if;
  insert into public.jobs (business_id, customer_id, address_id, category_id, title, description, price_cents, status, source, scheduled_start)
  values (v.business_id, v_crm, v_address, v_req.category_id, v_category, v_req.description || E'\n\n' || v.scope,
          v.agreed_price_cents, 'scheduled', 'marketplace', p_arrival_at)
  returning id into v_job;

  perform set_config('donezo.system_write', 'off', true);
  update public.bookings set status = 'active', confirmed_at = now(), arrival_at = p_arrival_at, crm_customer_id = v_crm, job_id = v_job
  where id = v.id returning * into v;
  update public.service_requests set status = 'booked', booked_at = now() where id = v.request_id;

  perform public.notify(v.customer_id, 'booking_confirmed', v_business_name || ' confirmed your job',
    'Arriving ' || to_char(p_arrival_at at time zone coalesce(v_tz, 'America/Chicago'), 'Dy Mon FMDD, FMHH12:MI AM') || '.', '/customer');
  for r in select id, business_id from public.bids where request_id = v.request_id and id <> v.bid_id and status = 'submitted' loop
    update public.bids set status = 'closed' where id = r.id;
    perform public.notify_business(r.business_id, 'bid_closed', 'A job you bid on was booked',
      'The customer chose another provider for ' || v_category || ' in ' || v_req.zip || '.', '/provider/marketplace?tab=bids');
  end loop;
  return v;
end;
$$;
revoke all on function public.confirm_booking(uuid, timestamptz) from public, anon;
grant execute on function public.confirm_booking(uuid, timestamptz) to authenticated;

-- Customer: add 10 minutes once 2:00 or less is left (repeatable).
create function public.extend_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare v public.bookings;
begin
  select * into v from public.bookings where id = p_booking_id for update;
  if v.id is null or v.customer_id <> auth.uid() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if v.status <> 'pending' then raise exception 'This provider is no longer waiting to confirm.' using errcode = 'P0001'; end if;
  if v.confirm_by < now() then
    perform public.lapse_booking(v.id, 'timeout');
    select * into v from public.bookings where id = p_booking_id;
    return v;
  end if;
  if v.confirm_by - now() > interval '2 minutes' then raise exception 'You can add time once 2 minutes or less are left.' using errcode = 'P0001'; end if;
  update public.bookings set confirm_by = confirm_by + interval '10 minutes', extensions = extensions + 1 where id = v.id returning * into v;
  perform public.notify_business(v.business_id, 'booking_extended', 'The customer gave you 10 more minutes',
    'Confirm the job with your arrival time.', '/provider/marketplace/bookings/' || v.id);
  return v;
end;
$$;

-- Customer: drop the provider who hasn't confirmed and choose another bid.
create function public.drop_pending_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v public.bookings;
begin
  select * into v from public.bookings where id = p_booking_id for update;
  if v.id is null or v.customer_id <> auth.uid() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if v.status <> 'pending' then raise exception 'This provider has already confirmed. Cancel the booking instead.' using errcode = 'P0001'; end if;
  perform public.lapse_booking(v.id, 'dropped');
end;
$$;

-- Either side's screen calls this when the countdown reaches zero (the minute job is the backstop).
create function public.check_booking_deadline(p_booking_id uuid)
returns public.booking_status
language plpgsql
security definer
set search_path = ''
as $$
declare v public.bookings;
begin
  select * into v from public.bookings where id = p_booking_id;
  if v.id is null or not (v.customer_id = auth.uid() or public.is_business_member(v.business_id)) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if v.status = 'pending' and v.confirm_by < now() then
    perform public.lapse_booking(v.id, 'timeout');
    return 'lapsed';
  end if;
  return v.status;
end;
$$;

create function public.expire_pending_bookings()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare r record;
begin
  for r in select id from public.bookings where status = 'pending' and confirm_by < now() loop
    perform public.lapse_booking(r.id, 'timeout');
  end loop;
end;
$$;
revoke all on function public.expire_pending_bookings() from public, anon, authenticated;
grant execute on function public.expire_pending_bookings() to service_role;
select cron.schedule('expire-pending-bookings', '* * * * *', 'select public.expire_pending_bookings()');

revoke all on function public.extend_booking(uuid), public.drop_pending_booking(uuid), public.check_booking_deadline(uuid) from public, anon;
grant execute on function public.extend_booking(uuid), public.drop_pending_booking(uuid), public.check_booking_deadline(uuid) to authenticated;

-- Chat: opens when the provider confirms; never while waiting, and a lapsed provider can't read or send.
create or replace function public.is_booking_participant(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
    where b.id = p_booking_id
      and (b.customer_id = (select auth.uid())
           or (public.is_business_member(b.business_id) and b.status <> 'lapsed'))
  );
$$;
create function public.messages_booking_open()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.bookings where id = new.booking_id and status = 'pending') then
    raise exception 'The chat opens once the provider confirms the job.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.bookings where id = new.booking_id and status = 'lapsed') then
    raise exception 'This conversation has ended.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.messages_booking_open() from public, anon, authenticated;
create trigger messages_booking_open before insert on public.messages for each row execute function public.messages_booking_open();

-- The customer's view of their current booking (never a lapsed one), with the countdown deadline and server time.
create or replace function public.customer_booking(p_request_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', bk.id, 'status', bk.status, 'agreed_price_cents', bk.agreed_price_cents,
    'original_price_cents', bk.original_price_cents, 'scope', bk.scope, 'created_at', bk.created_at,
    'completed_at', bk.completed_at, 'canceled_at', bk.canceled_at, 'cancel_reason', bk.cancel_reason,
    'confirm_by', bk.confirm_by, 'confirmed_at', bk.confirmed_at, 'arrival_at', bk.arrival_at, 'extensions', bk.extensions,
    'server_now', now(),
    'business', jsonb_build_object('id', b.id, 'name', b.name, 'phone', b.phone, 'email', b.email, 'logo_path', b.logo_path,
                                   'accepted_payment_methods', b.accepted_payment_methods),
    'job', (select jsonb_build_object('status', j.status, 'scheduled_start', j.scheduled_start, 'scheduled_end', j.scheduled_end)
            from public.jobs j where j.id = bk.job_id),
    'invoices', coalesce((select jsonb_agg(jsonb_build_object('number', i.number, 'status', i.status, 'total_cents', i.total_cents,
                                  'amount_paid_cents', i.amount_paid_cents, 'token', i.public_token) order by i.number)
                          from public.invoices i where i.job_id = bk.job_id and i.status not in ('draft', 'void')), '[]'::jsonb),
    'change_orders', coalesce((select jsonb_agg(jsonb_build_object('id', co.id, 'new_price_cents', co.new_price_cents,
                                  'description', co.description, 'status', co.status, 'created_at', co.created_at) order by co.created_at)
                               from public.change_orders co where co.booking_id = bk.id), '[]'::jsonb),
    'review', (select jsonb_build_object('rating', rv.rating, 'comment', rv.comment) from public.reviews rv where rv.booking_id = bk.id)
  )
  from public.bookings bk
  join public.businesses b on b.id = bk.business_id
  where bk.request_id = p_request_id and bk.customer_id = (select auth.uid()) and bk.status <> 'lapsed'
  order by bk.created_at desc
  limit 1;
$$;

-- Plan rule: let database steps that create marketplace records (confirm_booking) through on Basic.
create or replace function public.enforce_plan_crm()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record := case when tg_op = 'DELETE' then old else new end;
  v_business uuid := r.business_id;
  v_job uuid;
  v_ok boolean := false;
begin
  if auth.uid() is null or current_setting('donezo.system_write', true) = 'on' or public.is_admin() or not public.is_business_staff(v_business)
     or public.plan_has_feature(v_business, 'crm') then
    return r;
  end if;
  -- Marketplace work is allowed on Basic.
  if tg_table_name = 'jobs' then
    v_ok := tg_op <> 'INSERT' and r.source = 'marketplace';
  elsif tg_table_name = 'job_photos' then
    v_ok := exists (select 1 from public.jobs j where j.id = r.job_id and j.source = 'marketplace');
  elsif tg_table_name = 'invoices' then
    v_ok := exists (select 1 from public.jobs j where j.id = r.job_id and j.source = 'marketplace');
  elsif tg_table_name = 'payment_records' then
    -- A marketplace customer who paid in cash can still be marked as paid.
    v_ok := exists (select 1 from public.jobs j where j.id = r.job_id and j.source = 'marketplace')
         or exists (select 1 from public.invoices i join public.jobs j on j.id = i.job_id
                    where i.id = r.invoice_id and j.source = 'marketplace');
  elsif tg_table_name = 'invoice_line_items' then
    v_ok := exists (select 1 from public.invoices i join public.jobs j on j.id = i.job_id
                    where i.id = r.invoice_id and j.source = 'marketplace');
  end if;
  if not v_ok then
    raise exception 'This is part of DoneZo Pro. Upgrade your plan to use business tools.' using errcode = 'P0001';
  end if;
  return r;
end;
$$;
