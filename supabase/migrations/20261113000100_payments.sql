-- =====================================================================
-- DoneZo Phase 4 — Payments (Stripe), subscriptions and paid access
--
-- Owner decisions (docs/DECISIONS.md, 2026-11-11):
--   * Providers need an active $9.99/month subscription to use DoneZo (CRM and marketplace).
--   * DoneZo takes 10% of every card payment made through DoneZo, via Stripe Connect
--     direct charges (provider is the seller of record). No fee on cash/Venmo/Cash App/check.
--   * Refunds return DoneZo's fee too.
-- Payment status changes only come from verified Stripe webhooks, written by the server
-- with the service role through the functions below. Nothing here is callable by browsers.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Platform settings (admin-configurable fee; Blueprint §22)
-- ---------------------------------------------------------------------
create table public.platform_settings (
  id                       boolean primary key default true check (id),
  card_fee_bps             int not null default 1000 check (card_fee_bps between 0 and 3000),
  subscription_price_cents int not null default 999 check (subscription_price_cents > 0),
  updated_at               timestamptz not null default now()
);
insert into public.platform_settings default values;
alter table public.platform_settings enable row level security;
create policy "platform_settings: read" on public.platform_settings for select to anon, authenticated using (true);
grant select on public.platform_settings to anon, authenticated;

create function public.admin_set_card_fee(p_bps int)
returns public.platform_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.platform_settings;
  v_old int;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  select card_fee_bps into v_old from public.platform_settings;
  update public.platform_settings set card_fee_bps = p_bps, updated_at = now() where id returning * into v;
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'platform.card_fee', 'platform_settings', 'card_fee_bps', jsonb_build_object('from', v_old, 'to', p_bps));
  return v;
end;
$$;

-- The single paid plan.
update public.plans
set code = 'standard', name = 'DoneZo Standard',
    description = 'Business tools and marketplace access. $9.99 per month.'
where code = 'free_beta';
alter table public.plans add column price_cents int, add column stripe_lookup_key text unique;
update public.plans set price_cents = 999, stripe_lookup_key = 'donezo_standard_monthly' where code = 'standard';

-- ---------------------------------------------------------------------
-- Subscriptions (Stripe Billing on the platform account)
-- ---------------------------------------------------------------------
create type public.subscription_status as enum (
  'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'
);

create table public.business_subscriptions (
  business_id            uuid primary key references public.businesses (id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  status                 public.subscription_status,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create trigger business_subscriptions_set_updated_at before update on public.business_subscriptions
  for each row execute function public.set_updated_at();

-- Paid access: active or trialing, or past_due while Stripe retries the card.
create function public.business_has_access(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_subscriptions s
    join public.businesses b on b.id = s.business_id
    where s.business_id = p_business_id and not b.is_suspended
      and s.status in ('active', 'trialing', 'past_due')
  );
$$;

-- Block changes by a business's own members while it has no paid access. Customers' actions on a
-- booking (cancel, approve a change) and the payment system (no signed-in user) are not blocked.
create function public.enforce_business_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business uuid := case when tg_op = 'DELETE' then old.business_id else new.business_id end;
begin
  if auth.uid() is not null
     and public.is_business_member(v_business)
     and not public.business_has_access(v_business)
     and not public.is_admin() then
    raise exception 'Your DoneZo subscription isn''t active. Subscribe to keep working.' using errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'crm_customers', 'crm_customer_addresses', 'crm_customer_notes', 'recurring_schedules', 'jobs', 'job_photos',
    'estimates', 'estimate_line_items', 'invoices', 'invoice_line_items', 'payment_records',
    'bids', 'provider_categories', 'portfolio_photos'
  ] loop
    execute format(
      'create trigger %1$s_enforce_access before insert or update or delete on public.%1$I
         for each row execute function public.enforce_business_access()', t);
  end loop;
end;
$$;

-- A booking can't be created with a business that has no paid access.
create function public.bookings_require_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.business_has_access(new.business_id) then
    raise exception 'This provider isn''t taking marketplace jobs right now. Please choose another bid.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger bookings_require_access before insert on public.bookings
  for each row execute function public.bookings_require_access();

-- Only paid businesses see and are notified about marketplace jobs.
create or replace function public.business_can_see_request(p_request_id uuid, p_business_id uuid)
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
      and public.business_has_access(b.id)
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

create or replace function public.notify_new_request()
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
      and public.business_has_access(bz.id)
      and public.miles_between_zips(bz.home_zip, new.zip) <= bz.service_radius_miles
  loop
    perform public.notify_business(b.id, 'new_request', 'New ' || lower(v_category) || ' job near you',
      'ZIP ' || new.zip || '. Take a look and send a bid.', '/provider/marketplace/requests/' || new.id);
  end loop;
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- Providers' Stripe accounts (Connect)
-- ---------------------------------------------------------------------
create type public.stripe_account_status as enum ('onboarding_incomplete', 'pending_verification', 'active', 'restricted');

create table public.stripe_accounts (
  business_id       uuid primary key references public.businesses (id) on delete cascade,
  stripe_account_id text not null unique check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  status            public.stripe_account_status not null default 'onboarding_incomplete',
  charges_enabled   boolean not null default false,
  payouts_enabled   boolean not null default false,
  details_submitted boolean not null default false,
  requirements_due  text[] not null default '{}',
  disabled_reason   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger stripe_accounts_set_updated_at before update on public.stripe_accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Card payment requests (one Stripe Checkout Session each)
-- ---------------------------------------------------------------------
create type public.payment_request_status as enum ('open', 'paid', 'failed', 'expired', 'canceled');

create table public.payment_requests (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid not null,
  invoice_id            uuid not null,
  stripe_account_id     text not null,
  checkout_session_id   text not null unique,
  checkout_url          text not null,
  amount_cents          int not null check (amount_cents > 0),
  application_fee_cents int not null check (application_fee_cents >= 0),
  status                public.payment_request_status not null default 'open',
  failure_message       text,
  expires_at            timestamptz,
  paid_at               timestamptz,
  created_by            uuid references auth.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (business_id, invoice_id) references public.invoices (business_id, id) on delete cascade
);
create index payment_requests_invoice_idx on public.payment_requests (invoice_id, created_at desc);
create trigger payment_requests_set_updated_at before update on public.payment_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Stripe-verified payment details on payment records
-- ---------------------------------------------------------------------
alter table public.payment_records
  add column stripe_payment_intent_id text unique,
  add column stripe_charge_id text,
  add column application_fee_cents int not null default 0 check (application_fee_cents >= 0),
  add column refunded_cents int not null default 0 check (refunded_cents >= 0),
  add column refunded_at timestamptz,
  add column payment_request_id uuid references public.payment_requests (id) on delete set null,
  add constraint payment_records_refund_not_more_than_paid check (refunded_cents <= amount_cents),
  add constraint payment_records_stripe_has_intent check (verification <> 'stripe_verified' or stripe_payment_intent_id is not null);

-- Invoice totals now count refunds: amount paid = payments minus refunds; fully refunded → 'refunded'.
create or replace function public.invoices_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub int; v_taxable int; v_paid int; v_refunded int;
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

  select coalesce(sum(amount_cents - refunded_cents), 0), coalesce(sum(refunded_cents), 0)
    into v_paid, v_refunded
  from public.payment_records where invoice_id = new.id;
  new.amount_paid_cents := v_paid;

  if new.status not in ('void', 'draft') then
    if new.total_cents > 0 and v_paid >= new.total_cents then
      new.status := 'paid';
      new.paid_at := coalesce(new.paid_at, now());
    elsif v_paid > 0 then
      new.status := 'partially_paid';
      new.paid_at := null;
    elsif v_refunded > 0 then
      new.status := 'refunded';
      new.paid_at := null;
    else
      new.status := 'sent';
      new.paid_at := null;
    end if;
  end if;
  return new;
end;
$$;

-- Stripe-verified records can't be edited by providers.
create or replace function public.payment_records_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.invoice_status;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    if tg_op = 'UPDATE' then
      raise exception 'Payment records can''t be edited. Delete a mistaken record and add it again.' using errcode = '42501';
    end if;
    new.verification := 'provider_recorded';
    new.stripe_payment_intent_id := null;
    new.stripe_charge_id := null;
    new.application_fee_cents := 0;
    new.refunded_cents := 0;
    new.payment_request_id := null;
    if new.method = 'card' then
      raise exception 'Card payments are recorded automatically when Stripe confirms them' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'INSERT' and new.invoice_id is not null then
    select status into v_status from public.invoices where id = new.invoice_id;
    if v_status in ('void', 'draft') then
      raise exception 'Send the invoice before recording a payment against it (status: %)', v_status using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Webhook idempotency: each Stripe event is processed once.
-- ---------------------------------------------------------------------
create table public.stripe_events (
  id           text primary key check (id ~ '^evt_'),
  type         text not null,
  account      text,
  livemode     boolean not null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz,
  error        text
);

-- =====================================================================
-- Server-only functions called from the verified webhook handler
-- =====================================================================

-- A Checkout Session for an invoice was paid. Idempotent: a second call does nothing.
create function public.stripe_record_checkout_paid(
  p_checkout_session_id text, p_payment_intent_id text, p_charge_id text, p_amount_cents int
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  pr public.payment_requests;
  inv public.invoices;
  v_record uuid;
  v_job public.jobs;
  v_booking public.bookings;
begin
  select * into pr from public.payment_requests where checkout_session_id = p_checkout_session_id for update;
  if pr.id is null then raise exception 'Unknown checkout session %', p_checkout_session_id; end if;

  select id into v_record from public.payment_records where stripe_payment_intent_id = p_payment_intent_id;
  if v_record is not null then return v_record; end if;

  select * into inv from public.invoices where id = pr.invoice_id;
  insert into public.payment_records (business_id, customer_id, invoice_id, job_id, amount_cents, method, verification,
    received_on, note, stripe_payment_intent_id, stripe_charge_id, application_fee_cents, payment_request_id)
  values (pr.business_id, inv.customer_id, inv.id, inv.job_id, p_amount_cents, 'card', 'stripe_verified',
    public.business_today(pr.business_id), 'Paid by card through DoneZo', p_payment_intent_id, p_charge_id,
    pr.application_fee_cents, pr.id)
  returning id into v_record;

  update public.payment_requests set status = 'paid', paid_at = now(), failure_message = null where id = pr.id;
  -- Other open links for the same invoice are no longer needed.
  update public.payment_requests set status = 'canceled' where invoice_id = pr.invoice_id and status = 'open' and id <> pr.id;

  perform public.notify_business(pr.business_id, 'payment_received', 'Card payment received',
    'Invoice #' || inv.number || ': ' || '$' || to_char(p_amount_cents / 100.0, 'FM999,999,990.00') || ' paid by card.',
    '/provider/invoices/' || inv.id);

  if inv.job_id is not null then
    select * into v_job from public.jobs where id = inv.job_id;
    if v_job.status = 'awaiting_payment' and (select status from public.invoices where id = inv.id) = 'paid' then
      update public.jobs set status = 'completed' where id = v_job.id;
    end if;
    select * into v_booking from public.bookings where job_id = inv.job_id;
    if v_booking.id is not null then
      perform public.notify(v_booking.customer_id, 'payment_confirmed', 'Payment confirmed',
        'Your card payment of $' || to_char(p_amount_cents / 100.0, 'FM999,999,990.00') || ' was received. Thank you!',
        '/customer/requests/' || v_booking.request_id);
    end if;
  end if;
  return v_record;
end;
$$;

create function public.stripe_mark_payment_request(p_checkout_session_id text, p_status public.payment_request_status, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pr public.payment_requests;
begin
  update public.payment_requests set status = p_status, failure_message = left(p_message, 300)
  where checkout_session_id = p_checkout_session_id and status = 'open'
  returning * into pr;
  if pr.id is not null and p_status = 'failed' then
    perform public.notify_business(pr.business_id, 'payment_failed', 'A card payment failed',
      coalesce(left(p_message, 140), 'The customer can try again from the invoice link.'), '/provider/invoices/' || pr.invoice_id);
  end if;
end;
$$;

-- Record the total refunded on a payment (Stripe sends the running total).
create function public.stripe_record_refund(p_payment_intent_id text, p_refunded_total_cents int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.payment_records;
begin
  update public.payment_records
  set refunded_cents = least(p_refunded_total_cents, amount_cents), refunded_at = now()
  where stripe_payment_intent_id = p_payment_intent_id
  returning * into r;
  if r.id is null then return; end if;
  if r.invoice_id is not null then
    update public.invoices set updated_at = now() where id = r.invoice_id;
  end if;
  perform public.notify_business(r.business_id, 'refund', 'Refund completed',
    '$' || to_char(r.refunded_cents / 100.0, 'FM999,999,990.00') || ' was refunded to the customer.', '/provider/payments');
end;
$$;

-- Invoice details for the public "Pay by card" button, by link token (server only).
create function public.invoice_for_payment(p_token text)
returns table (invoice_id uuid, business_id uuid, number int, status public.invoice_status, balance_cents int,
               business_name text, source public.job_source, stripe_account_id text, stripe_status public.stripe_account_status)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.business_id, i.number, i.status, i.total_cents - i.amount_paid_cents, b.name, i.source,
         sa.stripe_account_id, sa.status
  from public.invoices i
  join public.businesses b on b.id = i.business_id
  left join public.stripe_accounts sa on sa.business_id = i.business_id
  where i.public_token = p_token and length(p_token) = 48 and i.status <> 'draft';
$$;

-- =====================================================================
-- Row Level Security and grants
-- =====================================================================
alter table public.business_subscriptions enable row level security;
alter table public.stripe_accounts        enable row level security;
alter table public.payment_requests       enable row level security;
alter table public.stripe_events          enable row level security;

create policy "business_subscriptions: members and admins read" on public.business_subscriptions for select to authenticated
  using ((select public.is_business_member(business_id)) or (select public.is_admin()));
create policy "stripe_accounts: members and admins read" on public.stripe_accounts for select to authenticated
  using ((select public.is_business_member(business_id)) or (select public.is_admin()));
create policy "payment_requests: members and admins read" on public.payment_requests for select to authenticated
  using ((select public.is_business_member(business_id)) or (select public.is_admin()));
-- stripe_events: no policies → no access except the service role.

grant select on public.business_subscriptions, public.stripe_accounts, public.payment_requests to authenticated;
-- Payment-record columns written only by Stripe webhooks; providers can still insert their own cash etc.
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

do $$
declare
  f text;
begin
  foreach f in array array[
    'admin_set_card_fee(int)', 'business_has_access(uuid)', 'enforce_business_access()', 'bookings_require_access()',
    'stripe_record_checkout_paid(text, text, text, int)', 'stripe_mark_payment_request(text, public.payment_request_status, text)',
    'stripe_record_refund(text, int)', 'invoice_for_payment(text)', 'business_can_see_request(uuid, uuid)', 'notify_new_request()',
    'invoices_before_write()', 'payment_records_before_write()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end;
$$;
grant execute on function public.admin_set_card_fee(int) to authenticated;
grant execute on function public.business_has_access(uuid) to authenticated;
grant execute on function public.business_can_see_request(uuid, uuid) to authenticated;
grant execute on function public.payment_records_before_write() to authenticated;

-- Job photos: uploads need paid access too.
drop policy "job-photos: business members upload" on storage.objects;
create policy "job-photos: business members upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-photos'
    and (select public.is_business_member(((storage.foldername(name))[1])::uuid))
    and (select public.business_has_access(((storage.foldername(name))[1])::uuid)));
