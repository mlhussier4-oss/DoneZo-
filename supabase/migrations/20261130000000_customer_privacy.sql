-- Owner decisions 2026-11-13 (customer privacy and profiles):
--  * Customers use a first name only, plus an optional profile photo.
--  * Providers see only that first name and photo: on the job board, the job page and once hired.
--  * DoneZo never hands providers the customer's email, phone or street address. The customer shares
--    the address (and anything else they choose) in the chat once the provider has confirmed the job.

-- 1. Profile photo. Public bucket with random file names; the path is only ever given out to the customer
--    themself and to providers who can see one of their jobs.
alter table public.profiles add column avatar_path text
  check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$');
grant update (avatar_path) on public.profiles to authenticated;
-- A person can only point avatar_path at their own folder.
alter table public.profiles add constraint profiles_avatar_own_folder
  check (avatar_path is null or split_part(avatar_path, '/', 1) = id::text);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "avatars: own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 2. First name only for customers (existing names are cut to the first word).
update public.profiles set full_name = nullif(split_part(trim(full_name), ' ', 1), '')
where role = 'customer' and full_name like '% %';

-- How a customer appears to providers.
create function public.customer_card(p_customer_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('first_name', coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'Customer'),
                            'avatar_path', p.avatar_path)
  from public.profiles p where p.id = p_customer_id;
$$;
revoke all on function public.customer_card(uuid) from public, anon, authenticated;

-- 3. Job board: add the customer's first name and photo.
drop function public.marketplace_feed();
create function public.marketplace_feed()
returns table (
  id uuid, category_name text, category_icon text, description text, details jsonb, timing public.request_timing,
  preferred_date date, zip text, miles numeric, created_at timestamptz, expires_at timestamptz,
  photo_count int, my_bid_status public.bid_status, my_bid_cents int, customer jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, c.name, c.icon, r.description, r.details, r.timing, r.preferred_date, r.zip,
         round(public.miles_between_zips(b.home_zip, r.zip)::numeric, 1), r.created_at, r.expires_at,
         (select count(*)::int from public.request_photos p where p.request_id = r.id),
         x.status, x.price_cents, public.customer_card(r.customer_id)
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

create or replace function public.marketplace_request_detail(p_request_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id, 'status', r.status, 'category_name', c.name, 'category_icon', c.icon,
    'description', r.description, 'details', r.details, 'timing', r.timing, 'preferred_date', r.preferred_date,
    'zip', r.zip, 'miles', round(public.miles_between_zips(b.home_zip, r.zip)::numeric, 1),
    'created_at', r.created_at, 'expires_at', r.expires_at,
    'photos', coalesce((select jsonb_agg(p.storage_path order by p.created_at) from public.request_photos p where p.request_id = r.id), '[]'::jsonb),
    'business_id', b.id,
    'customer', public.customer_card(r.customer_id)
  )
  from public.business_members m
  join public.businesses b on b.id = m.business_id
  join public.service_requests r on r.id = p_request_id
  join public.service_categories c on c.id = r.category_id
  where m.user_id = (select auth.uid()) and m.role in ('owner', 'manager') and public.business_can_see_request(r.id, b.id)
  limit 1;
$$;

-- Hired provider (any team member who can see the booking): the customer's first name and photo.
create function public.booking_customer(p_booking_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.customer_card(bk.customer_id) from public.bookings bk
  where bk.id = p_booking_id and public.is_business_member(bk.business_id);
$$;
revoke all on function public.booking_customer(uuid) from public, anon;
grant execute on function public.booking_customer(uuid) to authenticated;

-- 4. Confirming a job no longer copies the customer's email, phone or address into the provider's records.
create or replace function public.confirm_booking(p_booking_id uuid, p_arrival_at timestamptz)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.bookings;
  v_req public.service_requests;
  v_first text;
  v_category text;
  v_business_name text;
  v_tz text;
  v_crm uuid;
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
  v_first := public.customer_card(v_req.customer_id) ->> 'first_name';
  select name into v_category from public.service_categories where id = v_req.category_id;
  select name, timezone into v_business_name, v_tz from public.businesses where id = v.business_id;

  -- Marketplace bookings create the customer and job for the provider on any plan (Basic included).
  -- Only the first name: the customer shares their address and any contact details in the chat.
  perform set_config('donezo.system_write', 'on', true);
  select id into v_crm from public.crm_customers where business_id = v.business_id and profile_id = v_req.customer_id;
  if v_crm is null then
    insert into public.crm_customers (business_id, full_name, source, profile_id)
    values (v.business_id, v_first, 'marketplace', v_req.customer_id)
    returning id into v_crm;
  else
    update public.crm_customers set is_archived = false where id = v_crm;
  end if;
  insert into public.jobs (business_id, customer_id, category_id, title, description, price_cents, status, source, scheduled_start)
  values (v.business_id, v_crm, v_req.category_id, v_category, v_req.description || E'\n\n' || v.scope,
          v.agreed_price_cents, 'scheduled', 'marketplace', p_arrival_at)
  returning id into v_job;

  perform set_config('donezo.system_write', 'off', true);
  update public.bookings set status = 'active', confirmed_at = now(), arrival_at = p_arrival_at, crm_customer_id = v_crm, job_id = v_job
  where id = v.id returning * into v;
  update public.service_requests set status = 'booked', booked_at = now() where id = v.request_id;

  perform public.notify(v.customer_id, 'booking_confirmed', v_business_name || ' confirmed your job',
    'Arriving ' || to_char(p_arrival_at at time zone coalesce(v_tz, 'America/Chicago'), 'Dy Mon FMDD, FMHH12:MI AM') || '. Send them your address in the chat.', '/customer');
  for r in select id, business_id from public.bids where request_id = v.request_id and id <> v.bid_id and status = 'submitted' loop
    update public.bids set status = 'closed' where id = r.id;
    perform public.notify_business(r.business_id, 'bid_closed', 'A job you bid on was booked',
      'The customer chose another provider for ' || v_category || ' in ' || v_req.zip || '.', '/provider/marketplace?tab=bids');
  end loop;
  return v;
end;
$$;
