-- =====================================================================
-- DoneZo Phase 1 — Foundation
--
-- People, businesses (the provider "account"), business membership,
-- plans/feature entitlements, service categories and the admin audit log.
--
-- Security model:
--   * Every table has Row Level Security (RLS) enabled.
--   * Tables are NOT auto-exposed to the API (config: auto_expose_new_tables = false);
--     each table gets explicit, minimal grants below.
--   * Sensitive changes (roles, marketplace switch, admin actions) go through
--     SECURITY DEFINER functions that check permissions themselves.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.app_role as enum ('customer', 'provider', 'admin');
create type public.business_member_role as enum ('owner', 'manager', 'employee');

-- ---------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles: one row per login (auth.users). Holds the platform role.
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.app_role not null default 'customer',
  full_name   text check (char_length(full_name) <= 120),
  phone       text check (char_length(phone) <= 30),
  email       text,
  is_suspended boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- plans + plan_features: configurable subscription plans and entitlements.
-- No prices are set: pricing has not been approved (Blueprint §21).
-- Marketplace access is deliberately NOT a plan feature (Blueprint §21:
-- bidding visibility must not depend on subscription tier).
-- ---------------------------------------------------------------------
create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[a-z0-9_]+$'),
  name        text not null,
  description text,
  is_default  boolean not null default false,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Only one default plan may exist.
create unique index plans_one_default_idx on public.plans (is_default) where is_default;
create trigger plans_set_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

create table public.plan_features (
  plan_id     uuid not null references public.plans (id) on delete cascade,
  feature_key text not null check (feature_key ~ '^[a-z0-9_]+$'),
  enabled     boolean not null default true,
  -- Optional numeric limit (e.g. max customer records). NULL = unlimited.
  limit_value int check (limit_value is null or limit_value >= 0),
  primary key (plan_id, feature_key)
);

-- ---------------------------------------------------------------------
-- businesses: the provider account. CRM-only and CRM + Marketplace are the
-- SAME table; marketplace access is a switch (Blueprint §9).
-- ---------------------------------------------------------------------
create table public.businesses (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null check (char_length(name) between 1 and 120),
  email                   text check (char_length(email) <= 254),
  phone                   text check (char_length(phone) <= 30),
  description             text check (char_length(description) <= 2000),
  plan_id                 uuid not null references public.plans (id),
  marketplace_enabled     boolean not null default false,
  marketplace_enabled_at  timestamptz,
  is_suspended            boolean not null default false,
  created_by              uuid references auth.users (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index businesses_plan_idx on public.businesses (plan_id);
create index businesses_marketplace_idx on public.businesses (marketplace_enabled) where marketplace_enabled;
create trigger businesses_set_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- business_members: who belongs to which business, and in what role.
-- Phase 1 creates the owner; employees arrive in Phase 5.
-- ---------------------------------------------------------------------
create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        public.business_member_role not null default 'employee',
  created_at  timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index business_members_user_idx on public.business_members (user_id);

-- ---------------------------------------------------------------------
-- service_categories: managed by admins (Blueprint §2).
-- ---------------------------------------------------------------------
create table public.service_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  icon        text not null default 'wrench' check (icon ~ '^[a-z0-9-]+$'),
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger service_categories_set_updated_at before update on public.service_categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- admin_audit_log: append-only record of important admin actions.
-- ---------------------------------------------------------------------
create table public.admin_audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null,
  target_type text not null,
  target_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

-- =====================================================================
-- Permission helper functions (used by RLS policies).
-- SECURITY DEFINER so they can read membership without recursive RLS.
-- =====================================================================
create function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and not is_suspended
  );
$$;

create function public.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members
    where business_id = p_business_id and user_id = (select auth.uid())
  );
$$;

create function public.has_business_role(p_business_id uuid, p_roles public.business_member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members
    where business_id = p_business_id
      and user_id = (select auth.uid())
      and role = any (p_roles)
  );
$$;

-- =====================================================================
-- New-user trigger: create the profile, and for providers the business.
--
-- Sign-up metadata is supplied by the browser and therefore untrusted:
--   * role may only be 'customer' or 'provider'. Anything else (including
--     'admin') becomes 'customer'. Admins are created by scripts/create-admin.
--   * marketplace choice is a plain boolean.
-- =====================================================================
create function public.handle_new_user()
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
begin
  v_role := case when v_meta ->> 'role' = 'provider' then 'provider'::public.app_role
                 else 'customer'::public.app_role end;

  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    v_role,
    nullif(left(trim(v_meta ->> 'full_name'), 120), ''),
    new.email
  );

  if v_role = 'provider' then
    v_business_name := nullif(left(trim(v_meta ->> 'business_name'), 120), '');
    v_marketplace   := coalesce((v_meta ->> 'marketplace_enabled')::boolean, false);
    select id into v_plan_id from public.plans where is_default and is_active limit 1;
    if v_plan_id is null then
      raise exception 'No default plan configured';
    end if;

    insert into public.businesses (name, email, plan_id, marketplace_enabled, marketplace_enabled_at, created_by)
    values (
      coalesce(v_business_name, 'My business'),
      new.email,
      v_plan_id,
      v_marketplace,
      case when v_marketplace then now() end,
      new.id
    )
    returning id into v_business_id;

    insert into public.business_members (business_id, user_id, role)
    values (v_business_id, new.id, 'owner');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync when a user changes their login email.
create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- =====================================================================
-- Business actions
-- =====================================================================

-- Turn marketplace access on or off. Owners/managers only. No data moves:
-- it is the same business account either way (Blueprint §9).
create function public.set_marketplace_enabled(p_business_id uuid, p_enabled boolean)
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

-- Entitlements for a business: plan features as a key -> {enabled, limit} map.
create function public.business_entitlements(p_business_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_object_agg(pf.feature_key, jsonb_build_object('enabled', pf.enabled, 'limit', pf.limit_value)),
    '{}'::jsonb
  )
  from public.businesses b
  join public.plan_features pf on pf.plan_id = b.plan_id
  where b.id = p_business_id
    and (public.is_business_member(p_business_id) or public.is_admin());
$$;

-- =====================================================================
-- Admin actions (each writes to the audit log)
-- =====================================================================
create function public.admin_upsert_service_category(
  p_id uuid,
  p_slug text,
  p_name text,
  p_description text,
  p_icon text,
  p_sort_order int,
  p_is_active boolean
)
returns public.service_categories
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.service_categories;
  v_action text;
begin
  if not public.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if p_id is null then
    insert into public.service_categories (slug, name, description, icon, sort_order, is_active)
    values (p_slug, p_name, p_description, coalesce(p_icon, 'wrench'), coalesce(p_sort_order, 0), coalesce(p_is_active, true))
    returning * into v_row;
    v_action := 'service_category.create';
  else
    update public.service_categories
    set slug = p_slug, name = p_name, description = p_description,
        icon = coalesce(p_icon, icon), sort_order = coalesce(p_sort_order, sort_order),
        is_active = coalesce(p_is_active, is_active)
    where id = p_id
    returning * into v_row;
    if v_row.id is null then
      raise exception 'Category not found';
    end if;
    v_action := 'service_category.update';
  end if;

  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values ((select auth.uid()), v_action, 'service_category', v_row.id::text,
          jsonb_build_object('slug', v_row.slug, 'name', v_row.name, 'is_active', v_row.is_active));

  return v_row;
end;
$$;

create function public.admin_set_user_suspended(p_user_id uuid, p_suspended boolean, p_reason text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'Admins cannot suspend themselves';
  end if;

  update public.profiles set is_suspended = p_suspended where id = p_user_id returning * into v_row;
  if v_row.id is null then
    raise exception 'User not found';
  end if;

  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values ((select auth.uid()),
          case when p_suspended then 'user.suspend' else 'user.unsuspend' end,
          'user', p_user_id::text,
          jsonb_build_object('reason', left(coalesce(p_reason, ''), 500)));

  return v_row;
end;
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles            enable row level security;
alter table public.plans               enable row level security;
alter table public.plan_features       enable row level security;
alter table public.businesses          enable row level security;
alter table public.business_members    enable row level security;
alter table public.service_categories  enable row level security;
alter table public.admin_audit_log     enable row level security;

-- profiles: you see your own; admins see all.
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: admins read all" on public.profiles
  for select to authenticated using ((select public.is_admin()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- plans/features: readable by everyone (needed for a public pricing page later).
create policy "plans: read active" on public.plans
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "plan_features: read" on public.plan_features
  for select to anon, authenticated using (true);

-- businesses: members and admins only.
create policy "businesses: members read" on public.businesses
  for select to authenticated using ((select public.is_business_member(id)) or (select public.is_admin()));
create policy "businesses: owners/managers update" on public.businesses
  for update to authenticated
  using ((select public.has_business_role(id, array['owner','manager']::public.business_member_role[])))
  with check ((select public.has_business_role(id, array['owner','manager']::public.business_member_role[])));

-- business_members: visible to members of the same business and admins.
create policy "business_members: members read" on public.business_members
  for select to authenticated using ((select public.is_business_member(business_id)) or (select public.is_admin()));

-- service categories: everyone reads active ones; admins read all. Writes via admin function only.
create policy "service_categories: read active" on public.service_categories
  for select to anon, authenticated using (is_active or (select public.is_admin()));

-- audit log: admins read. Writes via SECURITY DEFINER functions only.
create policy "admin_audit_log: admins read" on public.admin_audit_log
  for select to authenticated using ((select public.is_admin()));

-- =====================================================================
-- Grants (explicit and minimal; nothing is auto-exposed)
-- =====================================================================
grant usage on schema public to anon, authenticated, service_role;

grant select on public.profiles to authenticated;
-- Users may edit only these columns of their own profile (never role or is_suspended).
grant update (full_name, phone) on public.profiles to authenticated;

grant select on public.plans, public.plan_features to anon, authenticated;

grant select on public.businesses to authenticated;
-- Owners/managers may edit only these columns directly. Marketplace, plan and
-- suspension changes go through functions.
grant update (name, email, phone, description) on public.businesses to authenticated;

grant select on public.business_members to authenticated;
grant select on public.service_categories to anon, authenticated;
grant select on public.admin_audit_log to authenticated;

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Functions: revoke the default PUBLIC execute, then grant deliberately.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.has_business_role(uuid, public.business_member_role[]) to authenticated;
grant execute on function public.set_marketplace_enabled(uuid, boolean) to authenticated;
grant execute on function public.business_entitlements(uuid) to authenticated;
grant execute on function public.admin_upsert_service_category(uuid, text, text, text, text, int, boolean) to authenticated;
grant execute on function public.admin_set_user_suspended(uuid, boolean, text) to authenticated;
grant execute on all functions in schema public to service_role;
-- The auth trigger runs as the auth admin role.
grant execute on function public.handle_new_user() to supabase_auth_admin;
grant execute on function public.handle_user_email_change() to supabase_auth_admin;

-- =====================================================================
-- Reference data that the app requires to function
-- =====================================================================
insert into public.plans (code, name, description, is_default, sort_order)
values ('free_beta', 'Free (beta)',
        'Every feature included while subscription pricing is being decided. Not a final price.',
        true, 0);

insert into public.plan_features (plan_id, feature_key, enabled, limit_value)
select p.id, f.key, true, null
from public.plans p
cross join (values
  ('crm_customers'), ('crm_calendar'), ('crm_recurring'), ('crm_jobs'),
  ('crm_invoices'), ('card_payments'), ('employees'), ('advanced_reports'),
  ('portfolio_photos'), ('route_planning'), ('bid_templates')
) as f(key)
where p.code = 'free_beta';

insert into public.service_categories (slug, name, description, icon, sort_order) values
  ('junk-removal',     'Junk removal',     'Haul away furniture, appliances, yard waste and clutter.', 'truck',     1),
  ('lawn-mowing',      'Lawn mowing',      'One-time or recurring mowing, edging and trimming.',       'sprout',    2),
  ('pet-waste-pickup', 'Pet waste pickup', 'Yard cleanup of pet waste, one-time or on a schedule.',    'paw-print', 3),
  ('pressure-washing', 'Pressure washing', 'Driveways, siding, decks, patios and fences.',             'droplets',  4),
  ('house-cleaning',   'House cleaning',   'Standard, deep and move-out cleaning.',                     'sparkles',  5);
