-- =====================================================================
-- DoneZo Phase 2 — Provider CRM
--
-- Customers (private to each business), addresses, notes, jobs (one row per
-- visit), recurring services, job photos, estimates, invoices and payment
-- records, plus dashboard figures.
--
-- Integrity rules enforced by the database (not just the website):
--   * Every row carries business_id; RLS limits access to that business's members.
--   * Composite foreign keys stop a job, invoice or payment from pointing at
--     another business's customer, or at an address of a different customer.
--   * Invoice totals, tax, amount paid and status are calculated here.
--   * Payment records written by providers are always "provider_recorded";
--     only the payment system (Phase 4, service role) can write "stripe_verified".
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- Business settings needed by the CRM
-- ---------------------------------------------------------------------
alter table public.businesses
  add column timezone text not null default 'America/New_York'
    check (timezone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+)*$'),
  add column default_tax_rate_bps int not null default 0
    check (default_tax_rate_bps between 0 and 10000);

grant update (timezone, default_tax_rate_bps) on public.businesses to authenticated;

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.customer_source as enum ('direct', 'marketplace');
create type public.job_source as enum ('direct', 'marketplace');
create type public.job_status as enum ('new', 'scheduled', 'in_progress', 'awaiting_payment', 'completed', 'canceled');
create type public.recurrence_frequency as enum ('weekly', 'biweekly', 'monthly', 'custom');
create type public.recurrence_status as enum ('active', 'paused', 'canceled');
create type public.estimate_status as enum ('draft', 'sent', 'accepted', 'declined', 'converted');
create type public.invoice_status as enum ('draft', 'sent', 'partially_paid', 'paid', 'void');
create type public.payment_method as enum ('cash', 'venmo', 'cash_app', 'check', 'card', 'other');
create type public.payment_verification as enum ('provider_recorded', 'stripe_verified');

-- ---------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------
create table public.crm_customers (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses (id) on delete cascade,
  full_name           text not null check (char_length(full_name) between 1 and 120),
  email               text check (char_length(email) <= 254),
  phone               text check (char_length(phone) <= 30),
  service_preferences text check (char_length(service_preferences) <= 2000),
  source              public.customer_source not null default 'direct',
  -- Set when this customer came from the marketplace (Phase 3). Never shared across businesses.
  profile_id          uuid references public.profiles (id) on delete set null,
  is_archived         boolean not null default false,
  created_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (business_id, id)
);
create index crm_customers_business_idx on public.crm_customers (business_id, is_archived, full_name);
create index crm_customers_name_trgm_idx on public.crm_customers using gin (full_name extensions.gin_trgm_ops);
-- One CRM record per marketplace customer per business (avoids duplicates).
create unique index crm_customers_profile_unique on public.crm_customers (business_id, profile_id) where profile_id is not null;
create trigger crm_customers_set_updated_at before update on public.crm_customers
  for each row execute function public.set_updated_at();

create table public.crm_customer_addresses (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  customer_id uuid not null,
  label       text check (char_length(label) <= 60),
  line1       text not null check (char_length(line1) between 1 and 200),
  line2       text check (char_length(line2) <= 200),
  city        text not null check (char_length(city) between 1 and 100),
  state       text not null check (char_length(state) between 1 and 50),
  postal_code text not null check (char_length(postal_code) between 3 and 12),
  access_notes text check (char_length(access_notes) <= 1000),
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (business_id, customer_id) references public.crm_customers (business_id, id) on delete cascade,
  unique (business_id, customer_id, id)
);
create index crm_customer_addresses_customer_idx on public.crm_customer_addresses (customer_id);
create unique index crm_customer_addresses_one_primary on public.crm_customer_addresses (customer_id) where is_primary;
create trigger crm_customer_addresses_set_updated_at before update on public.crm_customer_addresses
  for each row execute function public.set_updated_at();

create table public.crm_customer_notes (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  customer_id uuid not null,
  body        text not null check (char_length(body) between 1 and 5000),
  author_id   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  foreign key (business_id, customer_id) references public.crm_customers (business_id, id) on delete cascade
);
create index crm_customer_notes_customer_idx on public.crm_customer_notes (customer_id, created_at desc);

-- ---------------------------------------------------------------------
-- Recurring services ("mow every Tuesday at 9am for $45")
-- ---------------------------------------------------------------------
create table public.recurring_schedules (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null,
  customer_id       uuid not null,
  address_id        uuid,
  category_id       uuid references public.service_categories (id) on delete set null,
  title             text not null check (char_length(title) between 1 and 120),
  description       text check (char_length(description) <= 2000),
  price_cents       int not null check (price_cents between 0 and 100000000),
  frequency         public.recurrence_frequency not null,
  interval_days     int check (interval_days between 1 and 365),
  start_date        date not null,
  end_date          date,
  start_time        time not null,
  duration_minutes  int not null default 60 check (duration_minutes between 5 and 1440),
  status            public.recurrence_status not null default 'active',
  generated_through date,
  created_by        uuid references auth.users (id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (business_id, customer_id) references public.crm_customers (business_id, id) on delete cascade,
  foreign key (business_id, customer_id, address_id) references public.crm_customer_addresses (business_id, customer_id, id),
  check (frequency <> 'custom' or interval_days is not null),
  check (end_date is null or end_date >= start_date),
  unique (business_id, id)
);
create index recurring_schedules_business_idx on public.recurring_schedules (business_id, status);
create trigger recurring_schedules_set_updated_at before update on public.recurring_schedules
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Jobs: one row per visit
-- ---------------------------------------------------------------------
create table public.jobs (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid not null,
  customer_id           uuid not null,
  address_id            uuid,
  category_id           uuid references public.service_categories (id) on delete set null,
  title                 text not null check (char_length(title) between 1 and 120),
  description           text check (char_length(description) <= 5000),
  notes                 text check (char_length(notes) <= 5000),
  price_cents           int not null default 0 check (price_cents between 0 and 100000000),
  status                public.job_status not null default 'new',
  scheduled_start       timestamptz,
  scheduled_end         timestamptz,
  source                public.job_source not null default 'direct',
  recurring_schedule_id uuid,
  occurrence_date       date,
  -- True once someone changes a generated visit by hand; such visits are never regenerated.
  is_detached           boolean not null default false,
  started_at            timestamptz,
  completed_at          timestamptz,
  canceled_at           timestamptz,
  created_by            uuid references auth.users (id) on delete set null default auth.uid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (business_id, customer_id) references public.crm_customers (business_id, id) on delete cascade,
  foreign key (business_id, customer_id, address_id) references public.crm_customer_addresses (business_id, customer_id, id),
  foreign key (business_id, recurring_schedule_id) references public.recurring_schedules (business_id, id) on delete set null (recurring_schedule_id),
  check (scheduled_end is null or scheduled_start is null or scheduled_end >= scheduled_start),
  unique (business_id, customer_id, id),
  unique (recurring_schedule_id, occurrence_date)
);
create index jobs_business_schedule_idx on public.jobs (business_id, scheduled_start);
create index jobs_business_status_idx on public.jobs (business_id, status);
create index jobs_customer_idx on public.jobs (customer_id, scheduled_start desc);
create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

create table public.job_status_history (
  id          bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  job_id      uuid not null references public.jobs (id) on delete cascade,
  from_status public.job_status,
  to_status   public.job_status not null,
  changed_by  uuid references auth.users (id) on delete set null,
  changed_at  timestamptz not null default now()
);
create index job_status_history_job_idx on public.job_status_history (job_id, changed_at);

-- Record status changes with timestamps; mark hand-edited recurring visits as detached.
create function public.jobs_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'in_progress' and new.started_at is null then new.started_at := now(); end if;
    if new.status = 'completed' then new.completed_at := coalesce(new.completed_at, now()); end if;
    if new.status = 'canceled' then new.canceled_at := now(); end if;
    if old.status = 'completed' and new.status <> 'completed' then new.completed_at := null; end if;
    if old.status = 'canceled' and new.status <> 'canceled' then new.canceled_at := null; end if;
  end if;
  if tg_op = 'INSERT' and new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
  end if;
  if tg_op = 'UPDATE' and new.recurring_schedule_id is not null and (
       new.scheduled_start is distinct from old.scheduled_start
    or new.scheduled_end   is distinct from old.scheduled_end
    or new.price_cents     is distinct from old.price_cents
    or new.title           is distinct from old.title
    or new.address_id      is distinct from old.address_id) then
    new.is_detached := true;
  end if;
  return new;
end;
$$;
create trigger jobs_before_write before insert or update on public.jobs
  for each row execute function public.jobs_before_write();

create function public.jobs_log_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.job_status_history (business_id, job_id, from_status, to_status, changed_by)
    values (new.business_id, new.id, case when tg_op = 'UPDATE' then old.status end, new.status, auth.uid());
  end if;
  return null;
end;
$$;
create trigger jobs_log_status after insert or update of status on public.jobs
  for each row execute function public.jobs_log_status();

-- ---------------------------------------------------------------------
-- Recurring generation
-- ---------------------------------------------------------------------
create function public.business_today(p_business_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone timezone)::date from public.businesses where id = p_business_id;
$$;

-- Create the visits for one schedule from today up to p_through (never in the past,
-- never duplicating a date that already has a visit, including canceled ones).
create function public.generate_recurring_jobs(p_schedule_id uuid, p_through date)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  s        public.recurring_schedules;
  v_tz     text;
  v_today  date;
  v_until  date;
  v_date   date;
  v_k      int := 0;
  v_count  int := 0;
  v_start  timestamptz;
begin
  select * into s from public.recurring_schedules where id = p_schedule_id;
  if s.id is null or s.status <> 'active' then return 0; end if;

  select timezone into v_tz from public.businesses where id = s.business_id;
  v_today := (now() at time zone v_tz)::date;
  v_until := least(p_through, coalesce(s.end_date, p_through));

  loop
    v_date := case s.frequency
      when 'weekly'   then s.start_date + (7 * v_k)
      when 'biweekly' then s.start_date + (14 * v_k)
      when 'custom'   then s.start_date + (s.interval_days * v_k)
      when 'monthly'  then (s.start_date + make_interval(months => v_k))::date
    end;
    exit when v_date > v_until or v_k > 2000;
    if v_date >= v_today then
      v_start := (v_date + s.start_time) at time zone v_tz;
      insert into public.jobs (
        business_id, customer_id, address_id, category_id, title, description, price_cents,
        status, scheduled_start, scheduled_end, source, recurring_schedule_id, occurrence_date, created_by
      ) values (
        s.business_id, s.customer_id, s.address_id, s.category_id, s.title, s.description, s.price_cents,
        'scheduled', v_start, v_start + make_interval(mins => s.duration_minutes), 'direct', s.id, v_date, s.created_by
      )
      on conflict (recurring_schedule_id, occurrence_date) do nothing;
      if found then v_count := v_count + 1; end if;
    end if;
    v_k := v_k + 1;
  end loop;

  update public.recurring_schedules set generated_through = v_until where id = s.id;
  return v_count;
end;
$$;

-- Remove future visits that nobody has touched (not started, not edited, no invoice or photos).
create function public.clear_future_recurring_jobs(p_schedule_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business uuid;
  v_count int;
begin
  select business_id into v_business from public.recurring_schedules where id = p_schedule_id;
  delete from public.jobs j
  where j.recurring_schedule_id = p_schedule_id
    and j.status in ('new', 'scheduled')
    and not j.is_detached
    and j.occurrence_date >= public.business_today(v_business)
    and not exists (select 1 from public.invoices i where i.job_id = j.id)
    and not exists (select 1 from public.job_photos p where p.job_id = j.id)
    and not exists (select 1 from public.payment_records r where r.job_id = j.id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function public.recurring_schedules_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Avoid re-running when only generated_through changed (set by the generator itself).
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'generated_through' - 'updated_at')
                        = (to_jsonb(old) - 'generated_through' - 'updated_at') then
    return null;
  end if;
  if tg_op = 'UPDATE' then
    perform public.clear_future_recurring_jobs(new.id);
  end if;
  if new.status = 'active' then
    perform public.generate_recurring_jobs(new.id, public.business_today(new.business_id) + 90);
  end if;
  return null;
end;
$$;
create trigger recurring_schedules_after_write after insert or update on public.recurring_schedules
  for each row execute function public.recurring_schedules_after_write();

-- Nightly: keep every active schedule filled 90 days ahead.
create function public.extend_recurring_jobs()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_total int := 0;
begin
  for r in
    select s.id, s.business_id from public.recurring_schedules s
    where s.status = 'active'
      and (s.end_date is null or s.end_date >= public.business_today(s.business_id))
  loop
    v_total := v_total + public.generate_recurring_jobs(r.id, public.business_today(r.business_id) + 90);
  end loop;
  return v_total;
end;
$$;

-- ---------------------------------------------------------------------
-- Job photos (files live in the private "job-photos" storage bucket)
-- ---------------------------------------------------------------------
create table public.job_photos (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  job_id       uuid not null references public.jobs (id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|heic)$'),
  caption      text check (char_length(caption) <= 300),
  uploaded_by  uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  -- The file must sit in this business's folder and this job's subfolder.
  check (split_part(storage_path, '/', 1) = business_id::text),
  check (split_part(storage_path, '/', 2) = job_id::text)
);
create index job_photos_job_idx on public.job_photos (job_id, created_at);

-- A photo's business must match its job's business.
create function public.job_photos_check_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.jobs where id = new.job_id and business_id = new.business_id) then
    raise exception 'Job does not belong to this business';
  end if;
  return new;
end;
$$;
create trigger job_photos_check_job before insert or update on public.job_photos
  for each row execute function public.job_photos_check_job();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-photos', 'job-photos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

-- ---------------------------------------------------------------------
-- Document numbers (per business, per kind)
-- ---------------------------------------------------------------------
create table public.business_document_counters (
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind        text not null check (kind in ('invoice', 'estimate')),
  last_number int not null default 0,
  primary key (business_id, kind)
);

create function public.next_document_number(p_business_id uuid, p_kind text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_number int;
begin
  insert into public.business_document_counters (business_id, kind, last_number)
  values (p_business_id, p_kind, 1)
  on conflict (business_id, kind) do update set last_number = public.business_document_counters.last_number + 1
  returning last_number into v_number;
  return v_number;
end;
$$;

-- ---------------------------------------------------------------------
-- Estimates
-- ---------------------------------------------------------------------
create table public.estimates (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null,
  customer_id    uuid not null,
  job_id         uuid,
  number         int not null,
  status         public.estimate_status not null default 'draft',
  issue_date     date not null default current_date,
  valid_until    date,
  notes          text check (char_length(notes) <= 5000),
  tax_rate_bps   int not null default 0 check (tax_rate_bps between 0 and 10000),
  subtotal_cents int not null default 0,
  tax_cents      int not null default 0,
  total_cents    int not null default 0,
  public_token   text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  sent_at        timestamptz,
  decided_at     timestamptz,
  created_by     uuid references auth.users (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  foreign key (business_id, customer_id) references public.crm_customers (business_id, id) on delete cascade,
  foreign key (business_id, customer_id, job_id) references public.jobs (business_id, customer_id, id),
  unique (business_id, number),
  unique (business_id, id)
);
create index estimates_business_idx on public.estimates (business_id, status, issue_date desc);

create table public.estimate_line_items (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null,
  estimate_id      uuid not null,
  position         int not null default 0,
  description      text not null check (char_length(description) between 1 and 500),
  quantity         numeric(10, 2) not null default 1 check (quantity > 0 and quantity <= 100000),
  unit_price_cents int not null check (unit_price_cents between 0 and 100000000),
  taxable          boolean not null default true,
  amount_cents     int generated always as (round(quantity * unit_price_cents)::int) stored,
  foreign key (business_id, estimate_id) references public.estimates (business_id, id) on delete cascade
);
create index estimate_line_items_estimate_idx on public.estimate_line_items (estimate_id, position);

-- ---------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------
create table public.invoices (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null,
  customer_id       uuid not null,
  job_id            uuid,
  estimate_id       uuid,
  number            int not null,
  status            public.invoice_status not null default 'draft',
  issue_date        date not null default current_date,
  due_date          date,
  notes             text check (char_length(notes) <= 5000),
  tax_rate_bps      int not null default 0 check (tax_rate_bps between 0 and 10000),
  subtotal_cents    int not null default 0,
  tax_cents         int not null default 0,
  total_cents       int not null default 0,
  amount_paid_cents int not null default 0,
  -- Copied from the job: only 'marketplace' invoices can ever carry a marketplace fee (Phase 4).
  source            public.job_source not null default 'direct',
  public_token      text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  sent_at           timestamptz,
  paid_at           timestamptz,
  voided_at         timestamptz,
  created_by        uuid references auth.users (id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (business_id, customer_id) references public.crm_customers (business_id, id) on delete cascade,
  foreign key (business_id, customer_id, job_id) references public.jobs (business_id, customer_id, id),
  foreign key (business_id, estimate_id) references public.estimates (business_id, id),
  unique (business_id, number),
  unique (business_id, id),
  unique (business_id, customer_id, id)
);
create index invoices_business_idx on public.invoices (business_id, status, issue_date desc);
create index invoices_job_idx on public.invoices (job_id);

create table public.invoice_line_items (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null,
  invoice_id       uuid not null,
  position         int not null default 0,
  description      text not null check (char_length(description) between 1 and 500),
  quantity         numeric(10, 2) not null default 1 check (quantity > 0 and quantity <= 100000),
  unit_price_cents int not null check (unit_price_cents between 0 and 100000000),
  taxable          boolean not null default true,
  amount_cents     int generated always as (round(quantity * unit_price_cents)::int) stored,
  foreign key (business_id, invoice_id) references public.invoices (business_id, id) on delete cascade
);
create index invoice_line_items_invoice_idx on public.invoice_line_items (invoice_id, position);

-- ---------------------------------------------------------------------
-- Payment records
-- ---------------------------------------------------------------------
create table public.payment_records (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null,
  customer_id  uuid not null,
  invoice_id   uuid,
  job_id       uuid,
  amount_cents int not null check (amount_cents between 1 and 100000000),
  method       public.payment_method not null,
  verification public.payment_verification not null default 'provider_recorded',
  received_on  date not null default current_date,
  note         text check (char_length(note) <= 1000),
  recorded_by  uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  foreign key (business_id, customer_id) references public.crm_customers (business_id, id) on delete cascade,
  foreign key (business_id, customer_id, invoice_id) references public.invoices (business_id, customer_id, id),
  foreign key (business_id, customer_id, job_id) references public.jobs (business_id, customer_id, id),
  -- A card payment can only ever be one Stripe has verified (Blueprint §17).
  check (method <> 'card' or verification = 'stripe_verified')
);
create index payment_records_business_idx on public.payment_records (business_id, received_on desc);
create index payment_records_invoice_idx on public.payment_records (invoice_id);

-- ---------------------------------------------------------------------
-- Totals, numbering and status — calculated by the database
-- ---------------------------------------------------------------------
create function public.estimates_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub int; v_taxable int;
begin
  if tg_op = 'INSERT' then
    new.number := public.next_document_number(new.business_id, 'estimate');
  end if;
  select coalesce(sum(amount_cents), 0), coalesce(sum(amount_cents) filter (where taxable), 0)
    into v_sub, v_taxable
  from public.estimate_line_items where estimate_id = new.id;
  new.subtotal_cents := v_sub;
  new.tax_cents := round(v_taxable * new.tax_rate_bps / 10000.0)::int;
  new.total_cents := v_sub + new.tax_cents;
  return new;
end;
$$;
create trigger estimates_before_write before insert or update on public.estimates
  for each row execute function public.estimates_before_write();
create trigger estimates_set_updated_at before update on public.estimates
  for each row execute function public.set_updated_at();

create function public.invoices_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub int; v_taxable int; v_paid int;
begin
  if tg_op = 'INSERT' then
    new.number := public.next_document_number(new.business_id, 'invoice');
    if new.job_id is not null then
      select source into new.source from public.jobs where id = new.job_id;
    end if;
  end if;

  select coalesce(sum(amount_cents), 0), coalesce(sum(amount_cents) filter (where taxable), 0)
    into v_sub, v_taxable
  from public.invoice_line_items where invoice_id = new.id;
  new.subtotal_cents := v_sub;
  new.tax_cents := round(v_taxable * new.tax_rate_bps / 10000.0)::int;
  new.total_cents := v_sub + new.tax_cents;

  select coalesce(sum(amount_cents), 0) into v_paid from public.payment_records where invoice_id = new.id;
  new.amount_paid_cents := v_paid;

  if new.status not in ('void', 'draft') then
    if new.total_cents > 0 and v_paid >= new.total_cents then
      new.status := 'paid';
      new.paid_at := coalesce(new.paid_at, now());
    elsif v_paid > 0 then
      new.status := 'partially_paid';
      new.paid_at := null;
    else
      new.status := 'sent';
      new.paid_at := null;
    end if;
  end if;
  return new;
end;
$$;
create trigger invoices_before_write before insert or update on public.invoices
  for each row execute function public.invoices_before_write();
create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

-- Line items: only editable while the document is a draft or sent-but-unpaid; then refresh totals.
create function public.invoice_line_items_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
  v_status public.invoice_status;
begin
  select status into v_status from public.invoices where id = v_invoice;
  if v_status in ('partially_paid', 'paid', 'void') then
    raise exception 'This invoice can no longer be edited (status: %)', v_status using errcode = '42501';
  end if;
  update public.invoices set updated_at = now() where id = v_invoice;
  return null;
end;
$$;
create trigger invoice_line_items_after_write after insert or update or delete on public.invoice_line_items
  for each row execute function public.invoice_line_items_after_write();

create function public.estimate_line_items_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estimate uuid := coalesce(new.estimate_id, old.estimate_id);
  v_status public.estimate_status;
begin
  select status into v_status from public.estimates where id = v_estimate;
  if v_status in ('accepted', 'declined', 'converted') then
    raise exception 'This estimate can no longer be edited (status: %)', v_status using errcode = '42501';
  end if;
  update public.estimates set updated_at = now() where id = v_estimate;
  return null;
end;
$$;
create trigger estimate_line_items_after_write after insert or update or delete on public.estimate_line_items
  for each row execute function public.estimate_line_items_after_write();

-- Payments: provider-recorded only (unless written by the payment system), never on void/draft invoices.
-- SECURITY INVOKER on purpose: current_user must be the real caller's role.
create function public.payment_records_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.invoice_status;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    new.verification := 'provider_recorded';
    if new.method = 'card' then
      raise exception 'Card payments are recorded automatically when Stripe confirms them' using errcode = '42501';
    end if;
  end if;
  if new.invoice_id is not null then
    select status into v_status from public.invoices where id = new.invoice_id;
    if v_status in ('void', 'draft') then
      raise exception 'Send the invoice before recording a payment against it (status: %)', v_status using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger payment_records_before_write before insert or update on public.payment_records
  for each row execute function public.payment_records_before_write();

create function public.payment_records_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.invoice_id is not null then
    update public.invoices set updated_at = now() where id = old.invoice_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.invoice_id is not null then
    update public.invoices set updated_at = now() where id = new.invoice_id;
  end if;
  return null;
end;
$$;
create trigger payment_records_after_write after insert or update or delete on public.payment_records
  for each row execute function public.payment_records_after_write();

-- Providers may delete their own mistaken records, never Stripe-verified ones.
-- SECURITY INVOKER on purpose: current_user must be the real caller's role.
create function public.payment_records_before_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.verification = 'stripe_verified' and current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Stripe-verified payments cannot be deleted' using errcode = '42501';
  end if;
  return old;
end;
$$;
create trigger payment_records_before_delete before delete on public.payment_records
  for each row execute function public.payment_records_before_delete();

-- ---------------------------------------------------------------------
-- Plan limit on customer records (Blueprint §21). NULL limit = unlimited.
-- ---------------------------------------------------------------------
create function public.crm_customers_check_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enabled boolean; v_limit int; v_count int;
begin
  select pf.enabled, pf.limit_value into v_enabled, v_limit
  from public.businesses b
  join public.plan_features pf on pf.plan_id = b.plan_id and pf.feature_key = 'crm_customers'
  where b.id = new.business_id;
  if v_enabled is false then
    raise exception 'Your plan does not include the customer database' using errcode = '42501';
  end if;
  if v_limit is not null then
    select count(*) into v_count from public.crm_customers where business_id = new.business_id and not is_archived;
    if v_count >= v_limit then
      raise exception 'Your plan allows % active customers' , v_limit using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger crm_customers_check_limit before insert on public.crm_customers
  for each row execute function public.crm_customers_check_limit();

-- =====================================================================
-- Document actions
-- =====================================================================
create function public.send_invoice(p_invoice_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.invoices;
begin
  select * into v from public.invoices where id = p_invoice_id;
  if v.id is null or not public.is_business_member(v.business_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v.status = 'void' then raise exception 'This invoice is void'; end if;
  if v.total_cents <= 0 and v.status = 'draft' then raise exception 'Add at least one line item before sending'; end if;
  update public.invoices
  set status = case when status = 'draft' then 'sent'::public.invoice_status else status end,
      sent_at = now()
  where id = p_invoice_id
  returning * into v;
  return v;
end;
$$;

create function public.void_invoice(p_invoice_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.invoices;
begin
  select * into v from public.invoices where id = p_invoice_id;
  if v.id is null or not public.is_business_member(v.business_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v.amount_paid_cents > 0 then
    raise exception 'Remove recorded payments before voiding this invoice';
  end if;
  update public.invoices set status = 'void', voided_at = now() where id = p_invoice_id returning * into v;
  return v;
end;
$$;

create function public.set_estimate_status(p_estimate_id uuid, p_status public.estimate_status)
returns public.estimates
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.estimates;
begin
  select * into v from public.estimates where id = p_estimate_id;
  if v.id is null or not public.is_business_member(v.business_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_status not in ('sent', 'accepted', 'declined') then raise exception 'Invalid status'; end if;
  if v.status = 'converted' then raise exception 'This estimate has already been turned into an invoice'; end if;
  if p_status = 'sent' and v.total_cents <= 0 then raise exception 'Add at least one line item before sending'; end if;
  update public.estimates
  set status = p_status,
      sent_at = case when p_status = 'sent' then now() else sent_at end,
      decided_at = case when p_status in ('accepted', 'declined') then now() else decided_at end
  where id = p_estimate_id
  returning * into v;
  return v;
end;
$$;

create function public.convert_estimate_to_invoice(p_estimate_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.estimates;
  v public.invoices;
begin
  select * into e from public.estimates where id = p_estimate_id;
  if e.id is null or not public.is_business_member(e.business_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if e.status = 'converted' then raise exception 'This estimate has already been turned into an invoice'; end if;
  if e.status = 'declined' then raise exception 'This estimate was declined'; end if;

  insert into public.invoices (business_id, customer_id, job_id, estimate_id, notes, tax_rate_bps)
  values (e.business_id, e.customer_id, e.job_id, e.id, e.notes, e.tax_rate_bps)
  returning * into v;

  insert into public.invoice_line_items (business_id, invoice_id, position, description, quantity, unit_price_cents, taxable)
  select e.business_id, v.id, position, description, quantity, unit_price_cents, taxable
  from public.estimate_line_items where estimate_id = e.id;

  update public.estimates set status = 'converted', decided_at = coalesce(decided_at, now()) where id = e.id;
  select * into v from public.invoices where id = v.id;
  return v;
end;
$$;

-- Create an invoice for a job with one line item for the job's agreed price.
create function public.create_invoice_for_job(p_job_id uuid)
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
  select default_tax_rate_bps into v_tax from public.businesses where id = j.business_id;
  insert into public.invoices (business_id, customer_id, job_id, tax_rate_bps, due_date)
  values (j.business_id, j.customer_id, j.id, v_tax, public.business_today(j.business_id) + 14)
  returning * into v;
  insert into public.invoice_line_items (business_id, invoice_id, position, description, quantity, unit_price_cents)
  values (j.business_id, v.id, 0, j.title, 1, j.price_cents);
  select * into v from public.invoices where id = v.id;
  return v;
end;
$$;

-- =====================================================================
-- Public (customer-facing) document views, by unguessable link token.
-- Returns only what the customer needs; nothing for drafts.
-- =====================================================================
create function public.get_public_invoice(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'kind', 'invoice',
    'number', i.number,
    'status', i.status,
    'issue_date', i.issue_date,
    'due_date', i.due_date,
    'notes', i.notes,
    'subtotal_cents', i.subtotal_cents,
    'tax_rate_bps', i.tax_rate_bps,
    'tax_cents', i.tax_cents,
    'total_cents', i.total_cents,
    'amount_paid_cents', i.amount_paid_cents,
    'business', jsonb_build_object('name', b.name, 'email', b.email, 'phone', b.phone),
    'customer_name', c.full_name,
    'line_items', coalesce((
      select jsonb_agg(jsonb_build_object('description', li.description, 'quantity', li.quantity,
             'unit_price_cents', li.unit_price_cents, 'amount_cents', li.amount_cents) order by li.position, li.id)
      from public.invoice_line_items li where li.invoice_id = i.id), '[]'::jsonb)
  )
  from public.invoices i
  join public.businesses b on b.id = i.business_id
  join public.crm_customers c on c.id = i.customer_id
  where i.public_token = p_token and i.status <> 'draft' and length(p_token) = 48;
$$;

create function public.get_public_estimate(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'kind', 'estimate',
    'number', e.number,
    'status', e.status,
    'issue_date', e.issue_date,
    'valid_until', e.valid_until,
    'notes', e.notes,
    'subtotal_cents', e.subtotal_cents,
    'tax_rate_bps', e.tax_rate_bps,
    'tax_cents', e.tax_cents,
    'total_cents', e.total_cents,
    'business', jsonb_build_object('name', b.name, 'email', b.email, 'phone', b.phone),
    'customer_name', c.full_name,
    'line_items', coalesce((
      select jsonb_agg(jsonb_build_object('description', li.description, 'quantity', li.quantity,
             'unit_price_cents', li.unit_price_cents, 'amount_cents', li.amount_cents) order by li.position, li.id)
      from public.estimate_line_items li where li.estimate_id = e.id), '[]'::jsonb)
  )
  from public.estimates e
  join public.businesses b on b.id = e.business_id
  join public.crm_customers c on c.id = e.customer_id
  where e.public_token = p_token and e.status <> 'draft' and length(p_token) = 48;
$$;

-- =====================================================================
-- Dashboard figures (Blueprint §15) — real data, in the business's timezone.
-- "Revenue" = payments received (recorded or Stripe-verified).
-- =====================================================================
create function public.business_dashboard(p_business_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_today date;
  v_month_start date;
  v_week_start date;
  v_result jsonb;
begin
  if not (public.is_business_member(p_business_id) or public.is_admin()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select timezone into v_tz from public.businesses where id = p_business_id;
  v_today := (now() at time zone v_tz)::date;
  v_month_start := date_trunc('month', v_today)::date;
  v_week_start := date_trunc('week', v_today)::date; -- Monday

  select jsonb_build_object(
    'today', v_today,
    'revenue_month_cents', (select coalesce(sum(amount_cents), 0) from public.payment_records
                            where business_id = p_business_id and received_on >= v_month_start),
    'revenue_week_cents', (select coalesce(sum(amount_cents), 0) from public.payment_records
                           where business_id = p_business_id and received_on >= v_week_start),
    'completed_jobs_month', (select count(*) from public.jobs where business_id = p_business_id
                             and status = 'completed' and (completed_at at time zone v_tz)::date >= v_month_start),
    'upcoming_jobs_7d', (select count(*) from public.jobs where business_id = p_business_id
                         and status in ('new', 'scheduled') and scheduled_start >= now()
                         and scheduled_start < ((v_today + 8)::timestamp at time zone v_tz)),
    'new_customers_month', (select count(*) from public.crm_customers where business_id = p_business_id
                            and (created_at at time zone v_tz)::date >= v_month_start),
    'active_customers', (select count(*) from public.crm_customers where business_id = p_business_id and not is_archived),
    'repeat_customers', (select count(*) from (
                           select customer_id from public.jobs where business_id = p_business_id and status = 'completed'
                           group by customer_id having count(*) >= 2) t),
    'outstanding_invoices', (select count(*) from public.invoices where business_id = p_business_id
                             and status in ('sent', 'partially_paid')),
    'outstanding_cents', (select coalesce(sum(total_cents - amount_paid_cents), 0) from public.invoices
                          where business_id = p_business_id and status in ('sent', 'partially_paid')),
    'average_job_cents', (select coalesce(round(avg(price_cents))::int, 0) from public.jobs
                          where business_id = p_business_id and status = 'completed'
                          and completed_at >= now() - interval '90 days'),
    'revenue_by_category', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'cents', cents) order by cents desc)
      from (
        select coalesce(sc.name, 'Uncategorized') as name, sum(pr.amount_cents) as cents
        from public.payment_records pr
        left join public.invoices i on i.id = pr.invoice_id
        left join public.jobs j on j.id = coalesce(pr.job_id, i.job_id)
        left join public.service_categories sc on sc.id = j.category_id
        where pr.business_id = p_business_id and pr.received_on >= v_today - 365
        group by 1
      ) t), '[]'::jsonb),
    'revenue_by_month', coalesce((
      select jsonb_agg(jsonb_build_object('month', to_char(m, 'YYYY-MM'), 'cents', coalesce(cents, 0)) order by m)
      from generate_series(date_trunc('month', v_today) - interval '5 months', date_trunc('month', v_today), interval '1 month') m
      left join (
        select date_trunc('month', received_on) as month, sum(amount_cents) as cents
        from public.payment_records where business_id = p_business_id group by 1
      ) r on r.month = m), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

-- =====================================================================
-- Row Level Security: members of the business only
-- =====================================================================
alter table public.crm_customers              enable row level security;
alter table public.crm_customer_addresses     enable row level security;
alter table public.crm_customer_notes         enable row level security;
alter table public.recurring_schedules        enable row level security;
alter table public.jobs                       enable row level security;
alter table public.job_status_history         enable row level security;
alter table public.job_photos                 enable row level security;
alter table public.business_document_counters enable row level security;
alter table public.estimates                  enable row level security;
alter table public.estimate_line_items        enable row level security;
alter table public.invoices                   enable row level security;
alter table public.invoice_line_items         enable row level security;
alter table public.payment_records            enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'crm_customers', 'crm_customer_addresses', 'crm_customer_notes', 'recurring_schedules', 'jobs',
    'job_photos', 'estimates', 'estimate_line_items', 'invoices', 'invoice_line_items', 'payment_records'
  ] loop
    execute format(
      'create policy "%1$s: business members" on public.%1$I for all to authenticated
         using ((select public.is_business_member(business_id)))
         with check ((select public.is_business_member(business_id)))', t);
  end loop;
end;
$$;

create policy "job_status_history: business members read" on public.job_status_history
  for select to authenticated using ((select public.is_business_member(business_id)));

-- Storage: files in job-photos/<business_id>/... are visible only to that business.
create policy "job-photos: business members read" on storage.objects
  for select to authenticated
  using (bucket_id = 'job-photos' and (select public.is_business_member(((storage.foldername(name))[1])::uuid)));
create policy "job-photos: business members upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'job-photos' and (select public.is_business_member(((storage.foldername(name))[1])::uuid)));
create policy "job-photos: business members delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'job-photos' and (select public.is_business_member(((storage.foldername(name))[1])::uuid)));

-- =====================================================================
-- Grants (column-level where the database owns the value)
-- =====================================================================
grant select, insert, delete on public.crm_customers to authenticated;
grant update (full_name, email, phone, service_preferences, is_archived) on public.crm_customers to authenticated;
revoke insert on public.crm_customers from authenticated;
grant insert (business_id, full_name, email, phone, service_preferences) on public.crm_customers to authenticated;

grant select, insert, update, delete on public.crm_customer_addresses to authenticated;
grant select, insert, delete on public.crm_customer_notes to authenticated;

grant select, delete on public.recurring_schedules to authenticated;
grant insert (business_id, customer_id, address_id, category_id, title, description, price_cents, frequency,
              interval_days, start_date, end_date, start_time, duration_minutes)
  on public.recurring_schedules to authenticated;
grant update (address_id, category_id, title, description, price_cents, frequency, interval_days, start_date,
              end_date, start_time, duration_minutes, status)
  on public.recurring_schedules to authenticated;

grant select on public.jobs to authenticated;
grant insert (business_id, customer_id, address_id, category_id, title, description, notes, price_cents, status,
              scheduled_start, scheduled_end)
  on public.jobs to authenticated;
grant update (address_id, category_id, title, description, notes, price_cents, status, scheduled_start, scheduled_end)
  on public.jobs to authenticated;

grant select on public.job_status_history to authenticated;
grant select, insert (business_id, job_id, storage_path, caption), delete on public.job_photos to authenticated;

grant select, delete on public.estimates to authenticated;
grant insert (business_id, customer_id, job_id, issue_date, valid_until, notes, tax_rate_bps) on public.estimates to authenticated;
grant update (issue_date, valid_until, notes, tax_rate_bps) on public.estimates to authenticated;
grant select, insert, update, delete on public.estimate_line_items to authenticated;

grant select on public.invoices to authenticated;
grant insert (business_id, customer_id, job_id, issue_date, due_date, notes, tax_rate_bps) on public.invoices to authenticated;
grant update (issue_date, due_date, notes, tax_rate_bps) on public.invoices to authenticated;
grant select, insert, update, delete on public.invoice_line_items to authenticated;

grant select, delete on public.payment_records to authenticated;
grant insert (business_id, customer_id, invoice_id, job_id, amount_cents, method, received_on, note)
  on public.payment_records to authenticated;

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Drafts only: nobody deletes a sent invoice (void it instead).
create policy "invoices: delete drafts only" on public.invoices as restrictive for delete to authenticated
  using (status = 'draft');
grant delete on public.invoices to authenticated;
create policy "estimates: delete drafts only" on public.estimates as restrictive for delete to authenticated
  using (status = 'draft');

-- Functions
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.has_business_role(uuid, public.business_member_role[]) to authenticated;
grant execute on function public.set_marketplace_enabled(uuid, boolean) to authenticated;
grant execute on function public.business_entitlements(uuid) to authenticated;
grant execute on function public.admin_upsert_service_category(uuid, text, text, text, text, int, boolean) to authenticated;
grant execute on function public.admin_set_user_suspended(uuid, boolean, text) to authenticated;
grant execute on function public.send_invoice(uuid) to authenticated;
grant execute on function public.void_invoice(uuid) to authenticated;
grant execute on function public.set_estimate_status(uuid, public.estimate_status) to authenticated;
grant execute on function public.convert_estimate_to_invoice(uuid) to authenticated;
grant execute on function public.create_invoice_for_job(uuid) to authenticated;
grant execute on function public.business_dashboard(uuid) to authenticated;
grant execute on function public.get_public_invoice(text) to anon, authenticated;
grant execute on function public.get_public_estimate(text) to anon, authenticated;
grant execute on all functions in schema public to service_role;
grant execute on function public.handle_new_user() to supabase_auth_admin;
grant execute on function public.handle_user_email_change() to supabase_auth_admin;

-- =====================================================================
-- Nightly extension of recurring visits (03:15 UTC)
-- =====================================================================
create extension if not exists pg_cron;
select cron.schedule('extend-recurring-jobs', '15 3 * * *', 'select public.extend_recurring_jobs()');
