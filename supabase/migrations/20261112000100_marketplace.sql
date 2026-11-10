-- =====================================================================
-- DoneZo Phase 3 — Customer marketplace
--
-- Rules enforced here (Blueprint §4–8, §20, Part 12):
--   * Customers post without a card. Full address + phone are stored separately
--     and are only revealed to the provider whose bid is accepted.
--   * Providers only see open requests in their service radius and categories,
--     and never another provider's bid. Bids are sealed.
--   * CRM-only businesses (marketplace switched off) never see or bid on requests.
--   * Messaging exists only on a booking (i.e. after a bid is accepted).
--   * The agreed price can only change through a change order the customer approves.
--   * Reviews come only from customers of completed bookings; ratings can't be bought.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Distance between ZIP codes (great-circle, miles)
-- ---------------------------------------------------------------------
create function public.miles_between_zips(p_a text, p_b text)
returns double precision
language sql
stable
set search_path = ''
as $$
  select 3958.8 * 2 * asin(sqrt(
    power(sin(radians(b.latitude - a.latitude) / 2), 2) +
    cos(radians(a.latitude)) * cos(radians(b.latitude)) * power(sin(radians(b.longitude - a.longitude) / 2), 2)
  ))
  from public.zip_codes a, public.zip_codes b
  where a.zip = p_a and b.zip = p_b;
$$;

-- ---------------------------------------------------------------------
-- Service areas: where the marketplace is open (admin-managed). Launch: Austin, TX.
-- ---------------------------------------------------------------------
create table public.service_areas (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 80),
  center_zip   text not null references public.zip_codes (zip),
  radius_miles int not null check (radius_miles between 1 and 150),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger service_areas_set_updated_at before update on public.service_areas
  for each row execute function public.set_updated_at();
insert into public.service_areas (name, center_zip, radius_miles) values ('Austin, TX', '78701', 35);

create function public.zip_in_service_area(p_zip text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.service_areas s
    where s.is_active and public.miles_between_zips(s.center_zip, p_zip) <= s.radius_miles
  );
$$;

-- ---------------------------------------------------------------------
-- Provider marketplace profile
-- ---------------------------------------------------------------------
alter table public.businesses
  add column home_zip text references public.zip_codes (zip),
  add column service_radius_miles int not null default 15 check (service_radius_miles between 1 and 60),
  add column years_experience int check (years_experience between 0 and 100),
  add column accepted_payment_methods text[] not null default '{}'
    check (accepted_payment_methods <@ array['card', 'cash', 'venmo', 'cash_app', 'check']::text[]),
  add column logo_path text check (logo_path is null or logo_path ~ '^[0-9a-f-]{36}/logo-[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'),
  -- Set by an administrator after checking documents (Blueprint §6: never purchasable).
  add column verified_at timestamptz,
  add column verified_note text check (char_length(verified_note) <= 300);

grant update (home_zip, service_radius_miles, years_experience, accepted_payment_methods, logo_path)
  on public.businesses to authenticated;

create table public.provider_categories (
  business_id uuid not null references public.businesses (id) on delete cascade,
  category_id uuid not null references public.service_categories (id) on delete cascade,
  primary key (business_id, category_id)
);

create table public.portfolio_photos (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^[0-9a-f-]{36}/portfolio-[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'),
  caption      text check (char_length(caption) <= 200),
  created_at   timestamptz not null default now(),
  check (split_part(storage_path, '/', 1) = business_id::text)
);
create index portfolio_photos_business_idx on public.portfolio_photos (business_id, created_at);

-- Logos and portfolio photos are public (shown on the provider's public profile).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-media', 'business-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- ---------------------------------------------------------------------
-- Service requests (customer job posts)
-- ---------------------------------------------------------------------
create type public.request_timing as enum ('asap', 'tomorrow', 'within_3_days', 'this_week', 'specific_date');
create type public.request_status as enum ('open', 'booked', 'canceled', 'expired');
create type public.bid_status as enum ('submitted', 'withdrawn', 'accepted', 'closed');
create type public.booking_status as enum ('active', 'completed', 'canceled');
create type public.change_order_status as enum ('pending', 'approved', 'declined', 'withdrawn');

create table public.service_requests (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category_id    uuid not null references public.service_categories (id),
  description    text not null check (char_length(description) between 1 and 2000),
  details        jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object' and pg_column_size(details) < 4000),
  timing         public.request_timing not null,
  preferred_date date,
  zip            text not null references public.zip_codes (zip),
  status         public.request_status not null default 'open',
  expires_at     timestamptz not null default now() + interval '7 days',
  booked_at      timestamptz,
  canceled_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (timing <> 'specific_date' or preferred_date is not null)
);
create index service_requests_open_idx on public.service_requests (status, category_id, created_at desc);
create index service_requests_customer_idx on public.service_requests (customer_id, created_at desc);
create trigger service_requests_set_updated_at before update on public.service_requests
  for each row execute function public.set_updated_at();

-- Private: revealed only to the customer and, after acceptance, the chosen provider (via the CRM).
create table public.service_request_locations (
  request_id  uuid primary key references public.service_requests (id) on delete cascade,
  customer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  line1       text not null check (char_length(line1) between 1 and 200),
  line2       text check (char_length(line2) <= 200),
  city        text not null check (char_length(city) between 1 and 100),
  state       text not null default 'TX' check (char_length(state) between 2 and 50),
  phone       text check (char_length(phone) <= 30),
  sms_consent boolean not null default false
);

create table public.request_photos (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.service_requests (id) on delete cascade,
  customer_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|heic)$'),
  created_at   timestamptz not null default now(),
  check (split_part(storage_path, '/', 1) = customer_id::text),
  check (split_part(storage_path, '/', 2) = request_id::text)
);
create index request_photos_request_idx on public.request_photos (request_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-photos', 'request-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

-- New requests: only customers, only inside an active service area; status and expiry are set here.
create function public.service_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select role from public.profiles where id = new.customer_id) <> 'customer' then
    raise exception 'Only customer accounts can post jobs' using errcode = '42501';
  end if;
  if not public.zip_in_service_area(new.zip) then
    raise exception 'DoneZo isn''t available in ZIP % yet. We''re starting in the Austin, TX area.', new.zip using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.service_categories where id = new.category_id and is_active) then
    raise exception 'That service isn''t available' using errcode = 'P0001';
  end if;
  new.status := 'open';
  new.expires_at := now() + interval '7 days';
  new.booked_at := null;
  new.canceled_at := null;
  return new;
end;
$$;
create trigger service_requests_before_insert before insert on public.service_requests
  for each row execute function public.service_requests_before_insert();

-- ---------------------------------------------------------------------
-- Bids (sealed)
-- ---------------------------------------------------------------------
create table public.bids (
  id                 uuid primary key default gen_random_uuid(),
  request_id         uuid not null references public.service_requests (id) on delete cascade,
  business_id        uuid not null references public.businesses (id) on delete cascade,
  price_cents        int not null check (price_cents between 100 and 100000000),
  included           text not null check (char_length(included) between 1 and 2000),
  availability       text not null check (char_length(availability) between 1 and 300),
  exclusions         text check (char_length(exclusions) <= 1000),
  additional_charges text check (char_length(additional_charges) <= 1000),
  message            text check (char_length(message) <= 1000),
  status             public.bid_status not null default 'submitted',
  created_by         uuid references auth.users (id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (request_id, business_id)
);
create index bids_business_idx on public.bids (business_id, created_at desc);
create trigger bids_set_updated_at before update on public.bids
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Who may see a request
-- ---------------------------------------------------------------------
-- A business sees an open, unexpired request when its marketplace is on, it offers the
-- category, and the request is within its radius of the business's home ZIP.
-- It also keeps seeing requests it has bid on.
create function public.business_can_see_request(p_request_id uuid, p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.service_requests r
    join public.businesses b on b.id = p_business_id
    where r.id = p_request_id
      and b.marketplace_enabled and not b.is_suspended and b.home_zip is not null
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

-- The current user's businesses that can see a request.
create function public.current_user_can_see_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.service_requests r where r.id = p_request_id and r.customer_id = (select auth.uid())
  ) or exists (
    select 1 from public.business_members m
    where m.user_id = (select auth.uid()) and public.business_can_see_request(p_request_id, m.business_id)
  );
$$;

-- Bids can be placed and edited only on open requests the business can see; only withdrawal is
-- allowed as a status change by providers (acceptance/closing happens in accept_bid / cancel).
create function public.bids_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.request_status;
  v_expires timestamptz;
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then return new; end if;
  select status, expires_at into v_status, v_expires from public.service_requests where id = new.request_id;
  if tg_op = 'INSERT' then
    if v_status <> 'open' or v_expires <= now() or not public.business_can_see_request(new.request_id, new.business_id) then
      raise exception 'This job is no longer open for bids' using errcode = 'P0001';
    end if;
    new.status := 'submitted';
  else
    if new.request_id <> old.request_id or new.business_id <> old.business_id then
      raise exception 'Not allowed' using errcode = '42501';
    end if;
    if old.status <> 'submitted' or v_status <> 'open' then
      raise exception 'This bid can no longer be changed' using errcode = 'P0001';
    end if;
    if new.status not in ('submitted', 'withdrawn') then
      raise exception 'Not allowed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger bids_before_write before insert or update on public.bids
  for each row execute function public.bids_before_write();

-- ---------------------------------------------------------------------
-- Bookings (an accepted bid), messages, change orders, reviews
-- ---------------------------------------------------------------------
create table public.bookings (
  id                 uuid primary key default gen_random_uuid(),
  request_id         uuid not null unique references public.service_requests (id) on delete cascade,
  bid_id             uuid not null unique references public.bids (id),
  business_id        uuid not null references public.businesses (id) on delete cascade,
  customer_id        uuid not null references public.profiles (id) on delete cascade,
  crm_customer_id    uuid references public.crm_customers (id) on delete set null,
  job_id             uuid references public.jobs (id) on delete set null,
  agreed_price_cents int not null check (agreed_price_cents > 0),
  original_price_cents int not null check (original_price_cents > 0),
  scope              text not null,
  status             public.booking_status not null default 'active',
  canceled_by        uuid references auth.users (id) on delete set null,
  cancel_reason      text check (char_length(cancel_reason) <= 500),
  created_at         timestamptz not null default now(),
  completed_at       timestamptz,
  canceled_at        timestamptz
);
create index bookings_business_idx on public.bookings (business_id, created_at desc);
create index bookings_customer_idx on public.bookings (customer_id, created_at desc);
create unique index bookings_job_unique on public.bookings (job_id) where job_id is not null;

create function public.is_booking_participant(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
    where b.id = p_booking_id
      and (b.customer_id = (select auth.uid()) or public.is_business_member(b.business_id))
  );
$$;

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  sender_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body       text check (char_length(body) <= 4000),
  photo_path text check (photo_path is null or photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|heic)$'),
  created_at timestamptz not null default now(),
  check (coalesce(char_length(trim(body)), 0) > 0 or photo_path is not null),
  check (photo_path is null or split_part(photo_path, '/', 1) = booking_id::text)
);
create index messages_booking_idx on public.messages (booking_id, created_at);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('message-photos', 'message-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

create table public.change_orders (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings (id) on delete cascade,
  proposed_by     uuid references auth.users (id) on delete set null default auth.uid(),
  new_price_cents int not null check (new_price_cents between 100 and 100000000),
  description     text not null check (char_length(description) between 1 and 2000),
  status          public.change_order_status not null default 'pending',
  created_at      timestamptz not null default now(),
  decided_at      timestamptz
);
create index change_orders_booking_idx on public.change_orders (booking_id, created_at);
create unique index change_orders_one_pending on public.change_orders (booking_id) where status = 'pending';

create function public.change_orders_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = new.booking_id;
  if v_booking.id is null or not public.is_business_member(v_booking.business_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_booking.status <> 'active' then
    raise exception 'Changes can only be proposed on an active booking' using errcode = 'P0001';
  end if;
  new.status := 'pending';
  new.decided_at := null;
  new.proposed_by := auth.uid();
  return new;
end;
$$;
create trigger change_orders_before_insert before insert on public.change_orders
  for each row execute function public.change_orders_before_insert();

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references public.bookings (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  comment     text check (char_length(comment) <= 2000),
  created_at  timestamptz not null default now()
);
create index reviews_business_idx on public.reviews (business_id, created_at desc);

-- Reviews are tied to a real, completed booking by that customer (Blueprint §8).
create function public.reviews_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = new.booking_id;
  if v_booking.id is null or v_booking.customer_id <> auth.uid() or v_booking.status <> 'completed' then
    raise exception 'You can review a provider after they complete your job' using errcode = '42501';
  end if;
  new.customer_id := v_booking.customer_id;
  new.business_id := v_booking.business_id;
  return new;
end;
$$;
create trigger reviews_before_insert before insert on public.reviews
  for each row execute function public.reviews_before_insert();

-- ---------------------------------------------------------------------
-- Notifications (in-app) and support reports
-- ---------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  link       text check (link is null or link ~ '^/[A-Za-z0-9/_?=&%.-]*$'),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create function public.notify(p_user_id uuid, p_kind text, p_title text, p_body text, p_link text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, title, body, link) values (p_user_id, p_kind, p_title, p_body, p_link);
$$;

-- Notify every owner/manager of a business.
create function public.notify_business(p_business_id uuid, p_kind text, p_title text, p_body text, p_link text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, title, body, link)
  select m.user_id, p_kind, p_title, p_body, p_link
  from public.business_members m
  where m.business_id = p_business_id and m.role in ('owner', 'manager');
$$;

create table public.support_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  booking_id  uuid references public.bookings (id) on delete set null,
  request_id  uuid references public.service_requests (id) on delete set null,
  category    text not null check (category in ('problem_with_job', 'payment', 'safety', 'account', 'other')),
  message     text not null check (char_length(message) between 1 and 4000),
  status      text not null default 'open' check (status in ('open', 'resolved')),
  admin_note  text check (char_length(admin_note) <= 2000),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index support_reports_status_idx on public.support_reports (status, created_at desc);

create function public.support_reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.reporter_id := auth.uid();
  new.status := 'open';
  new.admin_note := null;
  new.resolved_at := null;
  if new.booking_id is not null and not public.is_booking_participant(new.booking_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if new.request_id is not null and not exists (
    select 1 from public.service_requests where id = new.request_id and customer_id = auth.uid()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger support_reports_before_insert before insert on public.support_reports
  for each row execute function public.support_reports_before_insert();

-- =====================================================================
-- Marketplace jobs keep the agreed price (Blueprint §5)
-- =====================================================================
-- A marketplace job's price, and its invoice lines, change only through an approved change order.
create function public.jobs_guard_marketplace_price()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.source = 'marketplace' and new.price_cents is distinct from old.price_cents
     and coalesce(current_setting('donezo.price_change_ok', true), '') <> 'on' then
    raise exception 'The price of a marketplace job can only change through a change order the customer approves' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger jobs_guard_marketplace_price before update of price_cents on public.jobs
  for each row execute function public.jobs_guard_marketplace_price();

create function public.invoice_lines_guard_marketplace()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_source public.job_source;
begin
  select source into v_source from public.invoices where id = coalesce(new.invoice_id, old.invoice_id);
  if v_source = 'marketplace' and coalesce(current_setting('donezo.price_change_ok', true), '') <> 'on' then
    raise exception 'Marketplace invoices always match the agreed price. Propose a change order to change it.' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger invoice_lines_guard_marketplace before insert or update or delete on public.invoice_line_items
  for each row execute function public.invoice_lines_guard_marketplace();

-- The agreed price is all-in for marketplace invoices: no tax added on top.
create or replace function public.invoices_marketplace_no_tax()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.source = 'marketplace' then new.tax_rate_bps := 0; end if;
  return new;
end;
$$;
create trigger invoices_a_marketplace_no_tax before insert or update on public.invoices
  for each row execute function public.invoices_marketplace_no_tax();

-- Let create_invoice_for_job write the single agreed-price line for marketplace jobs.
create or replace function public.create_invoice_for_job(p_job_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jobs;
  v public.invoices;
  v_tax int;
begin
  select * into j from public.jobs where id = p_job_id;
  if j.id is null or not public.is_business_member(j.business_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if j.source = 'marketplace' and exists (select 1 from public.invoices where job_id = j.id and status <> 'void') then
    raise exception 'This marketplace job already has an invoice' using errcode = 'P0001';
  end if;
  select default_tax_rate_bps into v_tax from public.businesses where id = j.business_id;
  perform set_config('donezo.price_change_ok', 'on', true);
  insert into public.invoices (business_id, customer_id, job_id, tax_rate_bps, due_date)
  values (j.business_id, j.customer_id, j.id, v_tax, public.business_today(j.business_id) + 14)
  returning * into v;
  insert into public.invoice_line_items (business_id, invoice_id, position, description, quantity, unit_price_cents)
  values (j.business_id, v.id, 0, j.title, 1, j.price_cents);
  perform set_config('donezo.price_change_ok', '', true);
  select * into v from public.invoices where id = v.id;
  return v;
end;
$$;

-- =====================================================================
-- Customer actions
-- =====================================================================

-- Accept a bid: creates the booking, locks the price and scope, closes other bids, reveals
-- the customer to the winning provider by adding them to its CRM, creates the CRM job,
-- and opens messaging (Blueprint §7).
create function public.accept_bid(p_bid_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bid public.bids;
  v_req public.service_requests;
  v_loc public.service_request_locations;
  v_profile public.profiles;
  v_category text;
  v_crm uuid;
  v_address uuid;
  v_job uuid;
  v_scope text;
  v_booking public.bookings;
  r record;
begin
  select * into v_bid from public.bids where id = p_bid_id for update;
  if v_bid.id is null then raise exception 'Bid not found' using errcode = 'P0001'; end if;
  select * into v_req from public.service_requests where id = v_bid.request_id for update;
  if v_req.customer_id <> auth.uid() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if v_req.status <> 'open' then raise exception 'This job has already been booked or closed' using errcode = 'P0001'; end if;
  if v_bid.status <> 'submitted' then raise exception 'This bid is no longer available' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.businesses where id = v_bid.business_id and marketplace_enabled and not is_suspended) then
    raise exception 'This provider is not taking marketplace jobs right now' using errcode = 'P0001';
  end if;

  select * into v_loc from public.service_request_locations where request_id = v_req.id;
  select * into v_profile from public.profiles where id = v_req.customer_id;
  select name into v_category from public.service_categories where id = v_req.category_id;

  v_scope := 'Included: ' || v_bid.included
    || coalesce(E'\nNot included: ' || nullif(v_bid.exclusions, ''), '')
    || coalesce(E'\nPossible extra charges: ' || nullif(v_bid.additional_charges, ''), '')
    || E'\nAvailability: ' || v_bid.availability;

  -- CRM customer (one per marketplace customer per business; no duplicates).
  select id into v_crm from public.crm_customers where business_id = v_bid.business_id and profile_id = v_req.customer_id;
  if v_crm is null then
    insert into public.crm_customers (business_id, full_name, email, phone, source, profile_id)
    values (v_bid.business_id, coalesce(nullif(v_profile.full_name, ''), 'DoneZo customer'), v_profile.email,
            coalesce(v_loc.phone, v_profile.phone), 'marketplace', v_req.customer_id)
    returning id into v_crm;
  else
    update public.crm_customers set is_archived = false,
      phone = coalesce(phone, v_loc.phone, v_profile.phone) where id = v_crm;
  end if;

  if v_loc.request_id is not null then
    insert into public.crm_customer_addresses (business_id, customer_id, line1, line2, city, state, postal_code, is_primary)
    values (v_bid.business_id, v_crm, v_loc.line1, v_loc.line2, v_loc.city, v_loc.state, v_req.zip,
            not exists (select 1 from public.crm_customer_addresses where customer_id = v_crm))
    returning id into v_address;
  end if;

  insert into public.jobs (business_id, customer_id, address_id, category_id, title, description, price_cents, status, source)
  values (v_bid.business_id, v_crm, v_address, v_req.category_id, v_category, v_req.description || E'\n\n' || v_scope,
          v_bid.price_cents, 'new', 'marketplace')
  returning id into v_job;

  insert into public.bookings (request_id, bid_id, business_id, customer_id, crm_customer_id, job_id,
                               agreed_price_cents, original_price_cents, scope)
  values (v_req.id, v_bid.id, v_bid.business_id, v_req.customer_id, v_crm, v_job, v_bid.price_cents, v_bid.price_cents, v_scope)
  returning * into v_booking;

  update public.bids set status = 'accepted' where id = v_bid.id;
  update public.service_requests set status = 'booked', booked_at = now() where id = v_req.id;

  perform public.notify_business(v_bid.business_id, 'bid_accepted', 'Your bid was accepted',
    v_category || ' in ' || v_req.zip || '. Message the customer to schedule.', '/provider/marketplace/bookings/' || v_booking.id);
  for r in select id, business_id from public.bids where request_id = v_req.id and id <> v_bid.id and status = 'submitted' loop
    update public.bids set status = 'closed' where id = r.id;
    perform public.notify_business(r.business_id, 'bid_closed', 'A job you bid on was booked',
      'The customer chose another provider for ' || v_category || ' in ' || v_req.zip || '.', '/provider/marketplace?tab=bids');
  end loop;

  return v_booking;
end;
$$;

create function public.cancel_request(p_request_id uuid)
returns public.service_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.service_requests;
  r record;
begin
  select * into v from public.service_requests where id = p_request_id for update;
  if v.id is null or v.customer_id <> auth.uid() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if v.status <> 'open' then raise exception 'Only open requests can be canceled' using errcode = 'P0001'; end if;
  update public.service_requests set status = 'canceled', canceled_at = now() where id = v.id returning * into v;
  for r in select id, business_id from public.bids where request_id = v.id and status = 'submitted' loop
    update public.bids set status = 'closed' where id = r.id;
    perform public.notify_business(r.business_id, 'request_canceled', 'A job you bid on was canceled',
      'The customer canceled their request in ' || v.zip || '.', '/provider/marketplace?tab=bids');
  end loop;
  return v;
end;
$$;

-- Either side can cancel a booking before the work has started.
create function public.cancel_booking(p_booking_id uuid, p_reason text)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.bookings;
  v_job_status public.job_status;
  v_is_customer boolean;
begin
  select * into v from public.bookings where id = p_booking_id for update;
  if v.id is null or not public.is_booking_participant(v.id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if v.status <> 'active' then raise exception 'This booking is not active' using errcode = 'P0001'; end if;
  select status into v_job_status from public.jobs where id = v.job_id;
  if v_job_status in ('in_progress', 'awaiting_payment', 'completed') then
    raise exception 'The work has already started. Report a problem instead and our team will help.' using errcode = 'P0001';
  end if;
  v_is_customer := v.customer_id = auth.uid();
  update public.bookings set status = 'canceled', canceled_at = now(), canceled_by = auth.uid(),
    cancel_reason = left(nullif(trim(p_reason), ''), 500)
  where id = v.id returning * into v;
  if v.job_id is not null then
    update public.jobs set status = 'canceled' where id = v.job_id;
  end if;
  if v_is_customer then
    perform public.notify_business(v.business_id, 'booking_canceled', 'A customer canceled a booking',
      coalesce(v.cancel_reason, 'No reason given.'), '/provider/marketplace/bookings/' || v.id);
  else
    perform public.notify(v.customer_id, 'booking_canceled', 'Your provider canceled the booking',
      coalesce(v.cancel_reason, 'No reason given.'), '/customer/requests/' || v.request_id);
  end if;
  return v;
end;
$$;

-- Customer approves or declines a proposed price/scope change (Blueprint §5).
create function public.decide_change_order(p_change_order_id uuid, p_approve boolean)
returns public.change_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  co public.change_orders;
  b public.bookings;
  v_invoice public.invoices;
begin
  select * into co from public.change_orders where id = p_change_order_id for update;
  if co.id is null then raise exception 'Not found' using errcode = 'P0001'; end if;
  select * into b from public.bookings where id = co.booking_id for update;
  if b.customer_id <> auth.uid() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if co.status <> 'pending' then raise exception 'This change has already been decided' using errcode = 'P0001'; end if;

  if not p_approve then
    update public.change_orders set status = 'declined', decided_at = now() where id = co.id returning * into co;
    perform public.notify_business(b.business_id, 'change_declined', 'Change declined',
      'The customer declined your proposed change. The original price stands.', '/provider/marketplace/bookings/' || b.id);
    return co;
  end if;

  if b.status <> 'active' then raise exception 'This booking is no longer active' using errcode = 'P0001'; end if;
  select * into v_invoice from public.invoices where job_id = b.job_id and status <> 'void' order by created_at desc limit 1;
  if v_invoice.id is not null and v_invoice.amount_paid_cents > 0 then
    raise exception 'This job has already been paid, so the price can''t change' using errcode = 'P0001';
  end if;

  perform set_config('donezo.price_change_ok', 'on', true);
  update public.bookings set agreed_price_cents = co.new_price_cents,
    scope = scope || E'\nChange approved ' || to_char(now(), 'YYYY-MM-DD') || ': ' || co.description
  where id = b.id;
  update public.jobs set price_cents = co.new_price_cents where id = b.job_id;
  if v_invoice.id is not null then
    delete from public.invoice_line_items where invoice_id = v_invoice.id;
    insert into public.invoice_line_items (business_id, invoice_id, position, description, quantity, unit_price_cents)
    select b.business_id, v_invoice.id, 0, j.title, 1, co.new_price_cents from public.jobs j where j.id = b.job_id;
  end if;
  perform set_config('donezo.price_change_ok', '', true);

  update public.change_orders set status = 'approved', decided_at = now() where id = co.id returning * into co;
  perform public.notify_business(b.business_id, 'change_approved', 'Change approved',
    'The customer approved the new price.', '/provider/marketplace/bookings/' || b.id);
  return co;
end;
$$;

-- Provider withdraws its own pending change order.
create function public.withdraw_change_order(p_change_order_id uuid)
returns public.change_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  co public.change_orders;
begin
  select c.* into co from public.change_orders c join public.bookings b on b.id = c.booking_id
  where c.id = p_change_order_id and public.is_business_member(b.business_id);
  if co.id is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  if co.status <> 'pending' then raise exception 'This change has already been decided' using errcode = 'P0001'; end if;
  update public.change_orders set status = 'withdrawn', decided_at = now() where id = co.id returning * into co;
  return co;
end;
$$;

-- Keep bookings in step with their CRM job.
create function public.jobs_sync_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
begin
  if new.source <> 'marketplace' or new.status is not distinct from old.status then return null; end if;
  select * into b from public.bookings where job_id = new.id;
  if b.id is null then return null; end if;
  if new.status = 'completed' and b.status = 'active' then
    update public.bookings set status = 'completed', completed_at = now() where id = b.id;
    perform public.notify(b.customer_id, 'job_completed', 'Your job is complete',
      'Let others know how it went: leave a review.', '/customer/requests/' || b.request_id);
  elsif new.status = 'canceled' and b.status = 'active' then
    update public.bookings set status = 'canceled', canceled_at = now(), canceled_by = auth.uid() where id = b.id;
    perform public.notify(b.customer_id, 'booking_canceled', 'Your provider canceled the job',
      'You can post the job again to get new bids.', '/customer/requests/' || b.request_id);
  elsif old.status = 'completed' and new.status <> 'completed' and b.status = 'completed' then
    update public.bookings set status = 'active', completed_at = null where id = b.id;
  end if;
  return null;
end;
$$;
create trigger jobs_sync_booking after update of status on public.jobs
  for each row execute function public.jobs_sync_booking();

-- =====================================================================
-- Notification triggers
-- =====================================================================
create function public.notify_new_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category text;
  b record;
begin
  select name into v_category from public.service_categories where id = new.category_id;
  for b in
    select bz.id from public.businesses bz
    join public.provider_categories pc on pc.business_id = bz.id and pc.category_id = new.category_id
    where bz.marketplace_enabled and not bz.is_suspended and bz.home_zip is not null
      and public.miles_between_zips(bz.home_zip, new.zip) <= bz.service_radius_miles
  loop
    perform public.notify_business(b.id, 'new_request', 'New ' || lower(v_category) || ' job near you',
      'ZIP ' || new.zip || '. Take a look and send a bid.', '/provider/marketplace/requests/' || new.id);
  end loop;
  return null;
end;
$$;
create trigger service_requests_notify after insert on public.service_requests
  for each row execute function public.notify_new_request();

create function public.notify_new_bid()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer uuid;
  v_name text;
begin
  select customer_id into v_customer from public.service_requests where id = new.request_id;
  select name into v_name from public.businesses where id = new.business_id;
  perform public.notify(v_customer, 'new_bid', 'New bid from ' || v_name,
    'Compare bids and choose your provider.', '/customer/requests/' || new.request_id);
  return null;
end;
$$;
create trigger bids_notify after insert on public.bids
  for each row execute function public.notify_new_bid();

create function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings where id = new.booking_id;
  if new.sender_id = b.customer_id then
    insert into public.notifications (user_id, kind, title, body, link)
    select m.user_id, 'message', 'New message from your customer', left(coalesce(new.body, 'Sent a photo'), 140),
           '/provider/marketplace/bookings/' || b.id
    from public.business_members m where m.business_id = b.business_id and m.user_id <> new.sender_id;
  else
    perform public.notify(b.customer_id, 'message', 'New message from your provider',
      left(coalesce(new.body, 'Sent a photo'), 140), '/customer/requests/' || b.request_id);
  end if;
  return null;
end;
$$;
create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_new_message();

create function public.notify_change_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings where id = new.booking_id;
  perform public.notify(b.customer_id, 'change_order', 'Your provider proposed a change',
    'New price $' || to_char(new.new_price_cents / 100.0, 'FM999,999,990.00') || '. Approve or decline it.',
    '/customer/requests/' || b.request_id);
  return null;
end;
$$;
create trigger change_orders_notify after insert on public.change_orders
  for each row execute function public.notify_change_order();

-- Nightly: expire open requests past their deadline and close their bids.
create function public.expire_requests()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  update public.bids set status = 'closed'
  where status = 'submitted' and request_id in (select id from public.service_requests where status = 'open' and expires_at <= now());
  update public.service_requests set status = 'expired' where status = 'open' and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
select cron.schedule('expire-requests', '30 3 * * *', 'select public.expire_requests()');

-- =====================================================================
-- Read models (safe, column-limited views exposed as functions)
-- =====================================================================

-- Provider job board: open requests this business can bid on. No customer identity or address.
create function public.marketplace_feed()
returns table (
  id uuid, category_name text, category_icon text, description text, details jsonb, timing public.request_timing,
  preferred_date date, zip text, miles numeric, created_at timestamptz, expires_at timestamptz,
  photo_count int, my_bid_status public.bid_status, my_bid_cents int
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, c.name, c.icon, r.description, r.details, r.timing, r.preferred_date, r.zip,
         round(public.miles_between_zips(b.home_zip, r.zip)::numeric, 1), r.created_at, r.expires_at,
         (select count(*)::int from public.request_photos p where p.request_id = r.id),
         x.status, x.price_cents
  from public.business_members m
  join public.businesses b on b.id = m.business_id
  join public.service_requests r on public.business_can_see_request(r.id, b.id)
  join public.service_categories c on c.id = r.category_id
  left join public.bids x on x.request_id = r.id and x.business_id = b.id
  where m.user_id = (select auth.uid())
  order by r.created_at desc
  limit 300;
$$;

create function public.marketplace_request_detail(p_request_id uuid)
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
    'business_id', b.id
  )
  from public.business_members m
  join public.businesses b on b.id = m.business_id
  join public.service_requests r on r.id = p_request_id
  join public.service_categories c on c.id = r.category_id
  where m.user_id = (select auth.uid()) and public.business_can_see_request(r.id, b.id)
  limit 1;
$$;

-- Public provider profile stats (ratings can't be bought: computed from real reviews only).
create function public.business_public_stats(p_business_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'rating', (select round(avg(rating)::numeric, 1) from public.reviews where business_id = p_business_id),
    'review_count', (select count(*) from public.reviews where business_id = p_business_id),
    'completed_jobs', (select count(*) from public.bookings where business_id = p_business_id and status = 'completed')
  );
$$;

create function public.get_provider_profile(p_business_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', b.id, 'name', b.name, 'description', b.description, 'years_experience', b.years_experience,
    'home_zip', b.home_zip, 'service_radius_miles', b.service_radius_miles,
    'accepted_payment_methods', b.accepted_payment_methods, 'logo_path', b.logo_path,
    'verified', b.verified_at is not null,
    'categories', coalesce((select jsonb_agg(c.name order by c.sort_order) from public.provider_categories pc
                            join public.service_categories c on c.id = pc.category_id where pc.business_id = b.id), '[]'::jsonb),
    'portfolio', coalesce((select jsonb_agg(jsonb_build_object('path', p.storage_path, 'caption', p.caption) order by p.created_at desc)
                           from public.portfolio_photos p where p.business_id = b.id), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('rating', rv.rating, 'comment', rv.comment, 'created_at', rv.created_at,
                                  'author', split_part(coalesce(pr.full_name, 'Customer'), ' ', 1)) order by rv.created_at desc)
                         from (select * from public.reviews where business_id = b.id order by created_at desc limit 20) rv
                         left join public.profiles pr on pr.id = rv.customer_id), '[]'::jsonb),
    'stats', public.business_public_stats(b.id)
  )
  from public.businesses b
  where b.id = p_business_id and b.marketplace_enabled and not b.is_suspended;
$$;

-- Bids on one of the customer's own requests, with each provider's public card.
create function public.request_bids(p_request_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', x.id, 'status', x.status, 'price_cents', x.price_cents, 'included', x.included,
    'availability', x.availability, 'exclusions', x.exclusions, 'additional_charges', x.additional_charges,
    'message', x.message, 'created_at', x.created_at,
    'business', jsonb_build_object(
      'id', b.id, 'name', b.name, 'logo_path', b.logo_path, 'years_experience', b.years_experience,
      'verified', b.verified_at is not null, 'accepted_payment_methods', b.accepted_payment_methods,
      'portfolio', coalesce((select jsonb_agg(p.storage_path) from (select storage_path from public.portfolio_photos
                             where business_id = b.id order by created_at desc limit 3) p), '[]'::jsonb),
      'stats', public.business_public_stats(b.id))
  ) order by x.price_cents), '[]'::jsonb)
  from public.bids x
  join public.businesses b on b.id = x.business_id
  join public.service_requests r on r.id = x.request_id
  where x.request_id = p_request_id and r.customer_id = (select auth.uid()) and x.status in ('submitted', 'accepted');
$$;

-- What a customer sees about their booking: job progress and invoices, never the provider's private notes.
create function public.customer_booking(p_request_id uuid)
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
  where bk.request_id = p_request_id and bk.customer_id = (select auth.uid());
$$;

-- =====================================================================
-- Admin
-- =====================================================================
create function public.admin_upsert_service_area(p_id uuid, p_name text, p_center_zip text, p_radius_miles int, p_is_active boolean)
returns public.service_areas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.service_areas;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_id is null then
    insert into public.service_areas (name, center_zip, radius_miles, is_active)
    values (p_name, p_center_zip, p_radius_miles, coalesce(p_is_active, true)) returning * into v;
  else
    update public.service_areas set name = p_name, center_zip = p_center_zip, radius_miles = p_radius_miles,
      is_active = coalesce(p_is_active, is_active) where id = p_id returning * into v;
  end if;
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), case when p_id is null then 'service_area.create' else 'service_area.update' end, 'service_area', v.id::text,
          jsonb_build_object('name', v.name, 'center_zip', v.center_zip, 'radius_miles', v.radius_miles, 'is_active', v.is_active));
  return v;
end;
$$;

create function public.admin_set_business_verified(p_business_id uuid, p_verified boolean, p_note text)
returns public.businesses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.businesses;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.businesses set verified_at = case when p_verified then now() end,
    verified_note = left(nullif(trim(p_note), ''), 300)
  where id = p_business_id returning * into v;
  if v.id is null then raise exception 'Business not found'; end if;
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), case when p_verified then 'business.verify' else 'business.unverify' end, 'business', v.id::text,
          jsonb_build_object('note', v.verified_note));
  return v;
end;
$$;

create function public.admin_resolve_report(p_report_id uuid, p_note text)
returns public.support_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.support_reports;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.support_reports set status = 'resolved', resolved_at = now(), admin_note = left(nullif(trim(p_note), ''), 2000)
  where id = p_report_id returning * into v;
  if v.id is null then raise exception 'Report not found'; end if;
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'support_report.resolve', 'support_report', v.id::text, jsonb_build_object('note', v.admin_note));
  return v;
end;
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.service_areas             enable row level security;
alter table public.provider_categories       enable row level security;
alter table public.portfolio_photos          enable row level security;
alter table public.service_requests          enable row level security;
alter table public.service_request_locations enable row level security;
alter table public.request_photos            enable row level security;
alter table public.bids                      enable row level security;
alter table public.bookings                  enable row level security;
alter table public.messages                  enable row level security;
alter table public.change_orders             enable row level security;
alter table public.reviews                   enable row level security;
alter table public.notifications             enable row level security;
alter table public.support_reports           enable row level security;

create policy "service_areas: read" on public.service_areas for select to anon, authenticated using (is_active or (select public.is_admin()));

create policy "provider_categories: public read" on public.provider_categories for select to anon, authenticated using (true);
create policy "provider_categories: members manage" on public.provider_categories for insert to authenticated
  with check ((select public.is_business_member(business_id)));
create policy "provider_categories: members delete" on public.provider_categories for delete to authenticated
  using ((select public.is_business_member(business_id)));

create policy "portfolio_photos: public read" on public.portfolio_photos for select to anon, authenticated using (true);
create policy "portfolio_photos: members insert" on public.portfolio_photos for insert to authenticated
  with check ((select public.is_business_member(business_id)));
create policy "portfolio_photos: members delete" on public.portfolio_photos for delete to authenticated
  using ((select public.is_business_member(business_id)));

create policy "service_requests: owner reads" on public.service_requests for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));
create policy "service_requests: owner creates" on public.service_requests for insert to authenticated
  with check (customer_id = (select auth.uid()));

create policy "locations: owner reads" on public.service_request_locations for select to authenticated
  using (customer_id = (select auth.uid()));
create policy "locations: owner creates" on public.service_request_locations for insert to authenticated
  with check (customer_id = (select auth.uid())
              and exists (select 1 from public.service_requests r where r.id = request_id and r.customer_id = (select auth.uid())));

create policy "request_photos: owner reads" on public.request_photos for select to authenticated
  using (customer_id = (select auth.uid()));
create policy "request_photos: owner adds" on public.request_photos for insert to authenticated
  with check (customer_id = (select auth.uid())
              and exists (select 1 from public.service_requests r where r.id = request_id and r.customer_id = (select auth.uid()) and r.status = 'open'));
create policy "request_photos: owner deletes" on public.request_photos for delete to authenticated
  using (customer_id = (select auth.uid()));

-- Sealed bids: a business sees only its own; a customer sees bids on their own requests.
create policy "bids: own business reads" on public.bids for select to authenticated
  using ((select public.is_business_member(business_id)));
create policy "bids: request owner reads" on public.bids for select to authenticated
  using (exists (select 1 from public.service_requests r where r.id = request_id and r.customer_id = (select auth.uid())));
create policy "bids: admins read" on public.bids for select to authenticated using ((select public.is_admin()));
create policy "bids: members create" on public.bids for insert to authenticated
  with check ((select public.is_business_member(business_id)));
create policy "bids: members update" on public.bids for update to authenticated
  using ((select public.is_business_member(business_id))) with check ((select public.is_business_member(business_id)));

create policy "bookings: participants read" on public.bookings for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_business_member(business_id)) or (select public.is_admin()));

create policy "messages: participants read" on public.messages for select to authenticated
  using ((select public.is_booking_participant(booking_id)));
create policy "messages: participants send" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and (select public.is_booking_participant(booking_id)));

create policy "change_orders: participants read" on public.change_orders for select to authenticated
  using ((select public.is_booking_participant(booking_id)));
create policy "change_orders: provider proposes" on public.change_orders for insert to authenticated
  with check ((select public.is_booking_participant(booking_id)));

create policy "reviews: public read" on public.reviews for select to anon, authenticated using (true);
create policy "reviews: customer writes" on public.reviews for insert to authenticated with check (true);

create policy "notifications: own" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: mark read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "support_reports: own or admin" on public.support_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));
create policy "support_reports: create" on public.support_reports for insert to authenticated with check (true);

-- Storage
create policy "request-photos: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'request-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "request-photos: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'request-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "request-photos: owner and eligible providers read" on storage.objects for select to authenticated
  using (bucket_id = 'request-photos' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.current_user_can_see_request(((storage.foldername(name))[2])::uuid)));

create policy "business-media: members upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'business-media' and (select public.is_business_member(((storage.foldername(name))[1])::uuid)));
create policy "business-media: members delete" on storage.objects for delete to authenticated
  using (bucket_id = 'business-media' and (select public.is_business_member(((storage.foldername(name))[1])::uuid)));

create policy "message-photos: participants upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'message-photos' and public.is_booking_participant(((storage.foldername(name))[1])::uuid));
create policy "message-photos: participants read" on storage.objects for select to authenticated
  using (bucket_id = 'message-photos' and public.is_booking_participant(((storage.foldername(name))[1])::uuid));

-- =====================================================================
-- Grants
-- =====================================================================
grant select on public.service_areas, public.provider_categories, public.portfolio_photos, public.reviews to anon, authenticated;
grant insert, delete on public.provider_categories to authenticated;
grant insert (business_id, storage_path, caption), delete on public.portfolio_photos to authenticated;

grant select on public.service_requests to authenticated;
grant insert (id, category_id, description, details, timing, preferred_date, zip) on public.service_requests to authenticated;
grant select, insert (request_id, line1, line2, city, state, phone, sms_consent) on public.service_request_locations to authenticated;
grant select, insert (request_id, storage_path), delete on public.request_photos to authenticated;

grant select on public.bids to authenticated;
grant insert (request_id, business_id, price_cents, included, availability, exclusions, additional_charges, message) on public.bids to authenticated;
grant update (price_cents, included, availability, exclusions, additional_charges, message, status) on public.bids to authenticated;

grant select on public.bookings to authenticated;
grant select, insert (booking_id, body, photo_path) on public.messages to authenticated;
grant select, insert (booking_id, new_price_cents, description) on public.change_orders to authenticated;
grant insert (booking_id, rating, comment) on public.reviews to authenticated;
grant select, update (read_at) on public.notifications to authenticated;
grant select, insert (booking_id, request_id, category, message) on public.support_reports to authenticated;

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Functions created in this migration: no default access, then explicit grants.
do $$
declare
  f text;
begin
  foreach f in array array[
    'miles_between_zips(text, text)', 'zip_in_service_area(text)', 'business_can_see_request(uuid, uuid)',
    'current_user_can_see_request(uuid)', 'is_booking_participant(uuid)', 'notify(uuid, text, text, text, text)',
    'notify_business(uuid, text, text, text, text)', 'accept_bid(uuid)', 'cancel_request(uuid)', 'cancel_booking(uuid, text)',
    'decide_change_order(uuid, boolean)', 'withdraw_change_order(uuid)', 'expire_requests()', 'marketplace_feed()',
    'marketplace_request_detail(uuid)', 'business_public_stats(uuid)', 'get_provider_profile(uuid)', 'request_bids(uuid)',
    'customer_booking(uuid)', 'admin_upsert_service_area(uuid, text, text, int, boolean)',
    'admin_set_business_verified(uuid, boolean, text)', 'admin_resolve_report(uuid, text)', 'create_invoice_for_job(uuid)',
    'service_requests_before_insert()', 'bids_before_write()', 'change_orders_before_insert()', 'reviews_before_insert()',
    'support_reports_before_insert()', 'jobs_guard_marketplace_price()', 'invoice_lines_guard_marketplace()',
    'invoices_marketplace_no_tax()', 'jobs_sync_booking()', 'notify_new_request()', 'notify_new_bid()',
    'notify_new_message()', 'notify_change_order()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end;
$$;

grant execute on function public.miles_between_zips(text, text) to authenticated;
grant execute on function public.zip_in_service_area(text) to anon, authenticated;
grant execute on function public.business_can_see_request(uuid, uuid) to authenticated;
grant execute on function public.current_user_can_see_request(uuid) to authenticated;
grant execute on function public.is_booking_participant(uuid) to authenticated;
grant execute on function public.accept_bid(uuid) to authenticated;
grant execute on function public.cancel_request(uuid) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
grant execute on function public.decide_change_order(uuid, boolean) to authenticated;
grant execute on function public.withdraw_change_order(uuid) to authenticated;
grant execute on function public.marketplace_feed() to authenticated;
grant execute on function public.marketplace_request_detail(uuid) to authenticated;
grant execute on function public.business_public_stats(uuid) to anon, authenticated;
grant execute on function public.get_provider_profile(uuid) to anon, authenticated;
grant execute on function public.request_bids(uuid) to authenticated;
grant execute on function public.customer_booking(uuid) to authenticated;
grant execute on function public.admin_upsert_service_area(uuid, text, text, int, boolean) to authenticated;
grant execute on function public.admin_set_business_verified(uuid, boolean, text) to authenticated;
grant execute on function public.admin_resolve_report(uuid, text) to authenticated;
grant execute on function public.create_invoice_for_job(uuid) to authenticated;
-- Invoker-rights trigger functions run as the caller and need EXECUTE.
grant execute on function public.bids_before_write() to authenticated;
grant execute on function public.jobs_guard_marketplace_price() to authenticated;
grant execute on function public.invoice_lines_guard_marketplace() to authenticated;
grant execute on function public.invoices_marketplace_no_tax() to authenticated;

-- Live chat and notifications
alter publication supabase_realtime add table public.messages, public.notifications;
