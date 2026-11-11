-- Owner decision 2026-11-11: two provider plans.
--   DoneZo Basic $9.99/month  : marketplace only (profile, bids, the jobs they win, card payments for those jobs).
--   DoneZo Pro   $19.99/month : marketplace + business tools (CRM, recurring, invoices for own customers,
--                               recorded payments, reports, route planning, team).
-- Marketplace access is identical on both plans; the tier only decides the business tools (Blueprint §21).
-- The plan a business is on is set from the price it actually pays in Stripe (server only).

update public.plans
set code = 'pro', name = 'DoneZo Pro', price_cents = 1999, stripe_lookup_key = 'donezo_pro_monthly', sort_order = 2,
    description = 'Business tools and the marketplace. $19.99 per month.'
where code = 'standard';

insert into public.plans (code, name, description, is_default, sort_order, price_cents, stripe_lookup_key)
values ('basic', 'DoneZo Basic', 'The marketplace: find local jobs, bid, and get paid. $9.99 per month.', false, 1, 999, 'donezo_basic_monthly');

-- Features. 'crm' is the switch for all business tools.
delete from public.plan_features;
insert into public.plan_features (plan_id, feature_key, enabled, limit_value)
select p.id, f.key, true, null
from public.plans p
cross join (values ('marketplace'), ('card_payments'), ('portfolio_photos'), ('bid_templates')) as f(key)
where p.code in ('basic', 'pro');
insert into public.plan_features (plan_id, feature_key, enabled, limit_value)
select p.id, f.key, true, null
from public.plans p
cross join (values ('crm'), ('crm_customers'), ('crm_calendar'), ('crm_recurring'), ('crm_jobs'), ('crm_invoices'),
                   ('recorded_payments'), ('employees'), ('advanced_reports'), ('route_planning')) as f(key)
where p.code = 'pro';

-- Subscription price no longer lives in platform_settings (each plan has its own price).
alter table public.platform_settings drop column if exists subscription_price_cents;

create function public.plan_has_feature(p_business_id uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.businesses b join public.plan_features pf on pf.plan_id = b.plan_id
    where b.id = p_business_id and pf.feature_key = p_feature and pf.enabled
  );
$$;

-- Business tools are available only on a paid plan that includes them.
create function public.business_has_crm(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.business_has_access(p_business_id) and public.plan_has_feature(p_business_id, 'crm');
$$;
revoke all on function public.plan_has_feature(uuid, text) from public, anon;
revoke all on function public.business_has_crm(uuid) from public, anon;
grant execute on function public.plan_has_feature(uuid, text), public.business_has_crm(uuid) to authenticated;

-- Basic plan: the business's own people can only work on MARKETPLACE jobs (and their invoices, photos).
-- Customers acting on a booking, the payment system and admins are never blocked here.
create function public.enforce_plan_crm()
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
  if auth.uid() is null or public.is_admin() or not public.is_business_staff(v_business)
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
revoke all on function public.enforce_plan_crm() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'crm_customers', 'crm_customer_addresses', 'crm_customer_notes', 'recurring_schedules', 'jobs', 'job_photos',
    'estimates', 'estimate_line_items', 'invoices', 'invoice_line_items', 'payment_records', 'job_assignments'
  ] loop
    execute format('create trigger %1$s_enforce_plan before insert or update or delete on public.%1$I
                    for each row execute function public.enforce_plan_crm()', t);
  end loop;
end;
$$;

-- Team members are a Pro feature.
create or replace function public.create_invitation(p_business_id uuid, p_email text, p_full_name text, p_role public.business_member_role)
returns public.business_invitations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.business_invitations;
  v_email text := lower(trim(p_email));
begin
  if not public.is_business_member(p_business_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_role not in ('manager', 'employee') then raise exception 'Invalid role' using errcode = 'P0001'; end if;
  if p_role = 'manager' and not public.has_business_role(p_business_id, array['owner']::public.business_member_role[]) then
    raise exception 'Only the owner can add managers' using errcode = '42501';
  end if;
  if not public.business_has_access(p_business_id) then
    raise exception 'Your DoneZo subscription isn''t active. Subscribe to keep working.' using errcode = 'P0001';
  end if;
  if not public.plan_has_feature(p_business_id, 'employees') then
    raise exception 'Team members are part of DoneZo Pro. Upgrade your plan to add your team.' using errcode = 'P0001';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email address' using errcode = 'P0001'; end if;
  if exists (select 1 from auth.users where lower(email) = v_email) and public.is_unaccepted_invitee(v_email) is null then
    raise exception 'That email already has a DoneZo account. Ask them to use a different email for work.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.business_invitations i where i.email = v_email and i.business_id <> p_business_id
             and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()) then
    raise exception 'That person has a pending invitation from another business.' using errcode = 'P0001';
  end if;
  update public.business_invitations set revoked_at = now()
  where business_id = p_business_id and email = v_email and accepted_at is null and revoked_at is null;
  insert into public.business_invitations (business_id, email, full_name, role)
  values (p_business_id, v_email, nullif(trim(p_full_name), ''), p_role)
  returning * into v;
  return v;
end;
$$;

-- Reports are a Pro feature (wrap the existing functions with a plan check).
alter function public.business_report(uuid, date, date) rename to business_report_unchecked;
alter function public.business_report_payments(uuid, date, date) rename to business_report_payments_unchecked;
revoke all on function public.business_report_unchecked(uuid, date, date) from public, anon, authenticated;
revoke all on function public.business_report_payments_unchecked(uuid, date, date) from public, anon, authenticated;

create function public.business_report(p_business_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() and public.is_business_member(p_business_id) and not public.plan_has_feature(p_business_id, 'advanced_reports') then
    raise exception 'Reports are part of DoneZo Pro.' using errcode = 'P0001';
  end if;
  return public.business_report_unchecked(p_business_id, p_from, p_to);
end;
$$;
create function public.business_report_payments(p_business_id uuid, p_from date, p_to date)
returns table (received_on date, customer text, invoice_number int, job_title text, method public.payment_method,
               verification public.payment_verification, amount_cents int, refunded_cents int, fee_cents int, note text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() and public.is_business_member(p_business_id) and not public.plan_has_feature(p_business_id, 'advanced_reports') then
    raise exception 'Reports are part of DoneZo Pro.' using errcode = 'P0001';
  end if;
  return query select * from public.business_report_payments_unchecked(p_business_id, p_from, p_to);
end;
$$;
revoke all on function public.business_report(uuid, date, date), public.business_report_payments(uuid, date, date) from public, anon;
grant execute on function public.business_report(uuid, date, date), public.business_report_payments(uuid, date, date) to authenticated;

-- New providers start on the plan they picked at sign-up (a preference only: what they actually pay
-- for in Stripe overwrites it). Default: Pro.
create or replace function public.signup_plan_id(p_meta jsonb)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select id from public.plans where code = p_meta ->> 'plan' and code in ('basic', 'pro') and is_active),
    (select id from public.plans where is_default and is_active limit 1));
$$;
revoke all on function public.signup_plan_id(jsonb) from public, anon, authenticated;
update public.plans set is_default = false;
update public.plans set is_default = true where code = 'pro';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta          jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role          public.app_role;
  v_business_name text;
  v_marketplace   boolean;
  v_plan_id       uuid;
  v_business_id   uuid;
  v_invite        public.business_invitations;
  v_name          text := nullif(left(trim(v_meta ->> 'full_name'), 120), '');
begin
  if v_meta ? 'invite_token' then
    select * into v_invite from public.business_invitations
    where token = v_meta ->> 'invite_token' and email = lower(new.email)
      and accepted_at is null and revoked_at is null and expires_at > now();
  end if;

  if v_invite.id is not null then
    insert into public.profiles (id, role, full_name, email)
    values (new.id, 'provider', coalesce(v_name, v_invite.full_name), new.email);
    -- Already confirmed (e.g. created by an admin): join now. Otherwise join when they accept.
    if new.email_confirmed_at is not null then
      perform public.accept_invitation_for(new.id, new.email, v_meta, v_name);
    end if;
    return new;
  end if;

  v_role := case when v_meta ->> 'role' = 'provider' then 'provider'::public.app_role else 'customer'::public.app_role end;
  insert into public.profiles (id, role, full_name, email)
  values (new.id, v_role, v_name, new.email);

  if v_role = 'provider' then
    v_business_name := nullif(left(trim(v_meta ->> 'business_name'), 120), '');
    v_marketplace   := coalesce((v_meta ->> 'marketplace_enabled')::boolean, false);
    v_plan_id := public.signup_plan_id(v_meta);
    -- DoneZo Basic is the marketplace plan.
    if (select code from public.plans where id = v_plan_id) = 'basic' then v_marketplace := true; end if;
    if v_plan_id is null then raise exception 'No default plan configured'; end if;
    insert into public.businesses (name, email, plan_id, marketplace_enabled, marketplace_enabled_at, created_by)
    values (coalesce(v_business_name, 'My business'), new.email, v_plan_id, v_marketplace,
            case when v_marketplace then now() end, new.id)
    returning id into v_business_id;
    insert into public.business_members (business_id, user_id, role) values (v_business_id, new.id, 'owner');
  end if;
  return new;
end;
$$;

-- Server only: set a business's plan from the Stripe price it pays.
create function public.set_business_plan_by_lookup_key(p_business_id uuid, p_lookup_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_plan uuid;
begin
  select id into v_plan from public.plans where stripe_lookup_key = p_lookup_key;
  if v_plan is null then raise exception 'Unknown plan price %', p_lookup_key; end if;
  update public.businesses set plan_id = v_plan, marketplace_enabled = case when (select code from public.plans where id = v_plan) = 'basic' then true else marketplace_enabled end,
    marketplace_enabled_at = case when (select code from public.plans where id = v_plan) = 'basic' and not marketplace_enabled then now() else marketplace_enabled_at end
  where id = p_business_id;
end;
$$;
revoke all on function public.set_business_plan_by_lookup_key(uuid, text) from public, anon, authenticated;
grant execute on function public.set_business_plan_by_lookup_key(uuid, text) to service_role;

-- Basic is the marketplace, so it can't be switched off on Basic (switch plans instead).
create or replace function public.set_marketplace_enabled(p_business_id uuid, p_enabled boolean)
returns public.businesses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business public.businesses;
begin
  if not public.has_business_role(p_business_id, array['owner', 'manager']::public.business_member_role[]) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if not p_enabled and not public.plan_has_feature(p_business_id, 'crm') then
    raise exception 'DoneZo Basic is the marketplace plan, so the marketplace stays on. Switch to Pro to use business tools without it.' using errcode = 'P0001';
  end if;
  update public.businesses
  set marketplace_enabled = p_enabled,
      marketplace_enabled_at = case
        when p_enabled and not marketplace_enabled then now()
        when p_enabled then marketplace_enabled_at
        else null end
  where id = p_business_id
  returning * into v_business;
  return v_business;
end;
$$;
