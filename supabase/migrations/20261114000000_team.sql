-- =====================================================================
-- DoneZo Phase 5 — Team: employees, permissions and job assignment
--
-- Roles in a business:
--   owner    – everything, including billing, Stripe and the team.
--   manager  – everything except billing and Stripe; can invite employees.
--   employee – only the jobs assigned to them (plus the customer name, phone and address those jobs
--              need): view, start/complete, notes and photos. No invoices, payments, reports,
--              customer list, settings or marketplace.
--
-- Until now `is_business_member` meant "any member", and every member was an owner. From here on it
-- means "can manage the business" (owner or manager), so every existing CRM/marketplace policy and
-- function automatically excludes employees. `is_business_staff` means "any member" and is used only
-- where employees need access.
-- =====================================================================

create function public.is_business_staff(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.business_members where business_id = p_business_id and user_id = (select auth.uid()));
$$;

create or replace function public.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members
    where business_id = p_business_id and user_id = (select auth.uid()) and role in ('owner', 'manager')
  );
$$;

-- Everyone on the team can see their business and its team list.
drop policy "businesses: members read" on public.businesses;
create policy "businesses: staff read" on public.businesses for select to authenticated
  using ((select public.is_business_staff(id)) or (select public.is_admin()));
drop policy "business_members: members read" on public.business_members;
create policy "business_members: staff read" on public.business_members for select to authenticated
  using ((select public.is_business_staff(business_id)) or (select public.is_admin()));
drop policy "business_subscriptions: members and admins read" on public.business_subscriptions;
create policy "business_subscriptions: staff and admins read" on public.business_subscriptions for select to authenticated
  using ((select public.is_business_staff(business_id)) or (select public.is_admin()));

-- Paid-access check applies to anyone on the team.
create or replace function public.enforce_business_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business uuid := case when tg_op = 'DELETE' then old.business_id else new.business_id end;
begin
  if auth.uid() is not null
     and public.is_business_staff(v_business)
     and not public.business_has_access(v_business)
     and not public.is_admin() then
    raise exception 'Your DoneZo subscription isn''t active. Subscribe to keep working.' using errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Marketplace job board is for owners/managers only.
create or replace function public.marketplace_feed()
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
  where m.user_id = (select auth.uid()) and m.role in ('owner', 'manager')
  order by r.created_at desc
  limit 300;
$$;

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
    'business_id', b.id
  )
  from public.business_members m
  join public.businesses b on b.id = m.business_id
  join public.service_requests r on r.id = p_request_id
  join public.service_categories c on c.id = r.category_id
  where m.user_id = (select auth.uid()) and m.role in ('owner', 'manager') and public.business_can_see_request(r.id, b.id)
  limit 1;
$$;

-- ---------------------------------------------------------------------
-- Job assignments
-- ---------------------------------------------------------------------
create table public.job_assignments (
  job_id      uuid not null references public.jobs (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  assigned_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  primary key (job_id, user_id)
);
create index job_assignments_user_idx on public.job_assignments (user_id);
create index job_assignments_business_idx on public.job_assignments (business_id);

-- The job and the person must both belong to this business; tell the person.
create function public.job_assignments_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.jobs where id = new.job_id and business_id = new.business_id) then
    raise exception 'Job does not belong to this business' using errcode = '42501';
  end if;
  if not exists (select 1 from public.business_members where business_id = new.business_id and user_id = new.user_id) then
    raise exception 'That person isn''t on this team' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger job_assignments_before_insert before insert on public.job_assignments
  for each row execute function public.job_assignments_before_insert();
create trigger job_assignments_enforce_access before insert or update or delete on public.job_assignments
  for each row execute function public.enforce_business_access();

create function public.job_assignments_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jobs;
  v_tz text;
begin
  if new.user_id = new.assigned_by then return null; end if;
  select * into j from public.jobs where id = new.job_id;
  select timezone into v_tz from public.businesses where id = j.business_id;
  perform public.notify(new.user_id, 'job_assigned', 'New job assigned to you',
    j.title || coalesce(' · ' || to_char(j.scheduled_start at time zone v_tz, 'Dy Mon DD, HH12:MI AM'), ''),
    '/provider/jobs/' || j.id);
  return null;
end;
$$;
create trigger job_assignments_notify after insert on public.job_assignments
  for each row execute function public.job_assignments_notify();

create function public.is_assigned_to_job(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.job_assignments where job_id = p_job_id and user_id = (select auth.uid()));
$$;

-- Default employee for a recurring service: new visits are assigned automatically.
alter table public.recurring_schedules add column default_assignee uuid references auth.users (id) on delete set null;
grant insert (default_assignee), update (default_assignee) on public.recurring_schedules to authenticated;

create function public.jobs_auto_assign()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if new.recurring_schedule_id is null then return null; end if;
  select default_assignee into v_user from public.recurring_schedules where id = new.recurring_schedule_id;
  if v_user is not null and exists (select 1 from public.business_members where business_id = new.business_id and user_id = v_user) then
    insert into public.job_assignments (job_id, user_id, business_id, assigned_by)
    values (new.id, v_user, new.business_id, v_user)  -- assigned_by = assignee: no notification for every generated visit
    on conflict do nothing;
  end if;
  return null;
end;
$$;
create trigger jobs_auto_assign after insert on public.jobs
  for each row execute function public.jobs_auto_assign();

-- ---------------------------------------------------------------------
-- What employees may see and do
-- ---------------------------------------------------------------------
create policy "jobs: assigned employees read" on public.jobs for select to authenticated
  using ((select public.is_assigned_to_job(id)));
create policy "jobs: assigned employees update" on public.jobs for update to authenticated
  using ((select public.is_assigned_to_job(id))) with check ((select public.is_assigned_to_job(id)));

-- Employees may only move a job along and add notes; everything else stays with managers.
create function public.jobs_employee_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Applies only to employees of this business (not managers, customers acting on a booking, or the system).
  if auth.uid() is null or not public.is_business_staff(new.business_id) or public.is_business_member(new.business_id)
     or public.is_admin() then
    return new;
  end if;
  if (to_jsonb(new) - 'status' - 'notes' - 'started_at' - 'completed_at' - 'canceled_at' - 'updated_at' - 'is_detached')
     is distinct from (to_jsonb(old) - 'status' - 'notes' - 'started_at' - 'completed_at' - 'canceled_at' - 'updated_at' - 'is_detached') then
    raise exception 'Only the owner or a manager can change job details' using errcode = '42501';
  end if;
  if new.status is distinct from old.status and new.status not in ('in_progress', 'awaiting_payment', 'completed') then
    raise exception 'Ask a manager to cancel or reschedule this job' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger jobs_employee_guard before update on public.jobs
  for each row execute function public.jobs_employee_guard();

create policy "job_status_history: assigned employees read" on public.job_status_history for select to authenticated
  using ((select public.is_assigned_to_job(job_id)));

create policy "job_photos: assigned employees read" on public.job_photos for select to authenticated
  using ((select public.is_assigned_to_job(job_id)));
create policy "job_photos: assigned employees add" on public.job_photos for insert to authenticated
  with check ((select public.is_assigned_to_job(job_id)) and (select public.is_business_staff(business_id)));

-- Customer details only for customers of the employee's assigned jobs.
create function public.is_assigned_to_customer(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.job_assignments a join public.jobs j on j.id = a.job_id
    where a.user_id = (select auth.uid()) and j.customer_id = p_customer_id
  );
$$;
create policy "crm_customers: assigned employees read" on public.crm_customers for select to authenticated
  using ((select public.is_assigned_to_customer(id)));
create policy "crm_customer_addresses: assigned employees read" on public.crm_customer_addresses for select to authenticated
  using ((select public.is_assigned_to_customer(customer_id)));

-- Job photos in storage: assigned employees can view and upload.
create policy "job-photos: assigned employees read" on storage.objects for select to authenticated
  using (bucket_id = 'job-photos' and (select public.is_assigned_to_job(((storage.foldername(name))[2])::uuid)));
create policy "job-photos: assigned employees upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-photos'
    and (select public.is_assigned_to_job(((storage.foldername(name))[2])::uuid))
    and (select public.business_has_access(((storage.foldername(name))[1])::uuid)));

-- job_assignments: managers manage; employees see their own.
alter table public.job_assignments enable row level security;
create policy "job_assignments: managers manage" on public.job_assignments for all to authenticated
  using ((select public.is_business_member(business_id))) with check ((select public.is_business_member(business_id)));
create policy "job_assignments: own read" on public.job_assignments for select to authenticated
  using (user_id = (select auth.uid()));
grant select, insert (job_id, user_id, business_id), delete on public.job_assignments to authenticated;

-- Team members can read each other's names (for assignment lists and "assigned to" labels).
create policy "profiles: teammates read" on public.profiles for select to authenticated
  using (exists (
    select 1 from public.business_members mine
    join public.business_members theirs on theirs.business_id = mine.business_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.id
  ));

-- ---------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------
create table public.business_invitations (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  email       text not null check (email = lower(email) and char_length(email) <= 254),
  full_name   text check (char_length(full_name) <= 120),
  role        public.business_member_role not null check (role in ('manager', 'employee')),
  token       text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by  uuid references auth.users (id) on delete set null default auth.uid(),
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);
create unique index business_invitations_one_pending on public.business_invitations (business_id, email)
  where accepted_at is null and revoked_at is null;

alter table public.business_invitations enable row level security;
create policy "business_invitations: managers read" on public.business_invitations for select to authenticated
  using ((select public.is_business_member(business_id)));
grant select on public.business_invitations to authenticated;

-- Create an invitation (owner: managers or employees; manager: employees only). The server then
-- sends Supabase's invite email carrying the token.
create function public.create_invitation(p_business_id uuid, p_email text, p_full_name text, p_role public.business_member_role)
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
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email address' using errcode = 'P0001'; end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'That email already has a DoneZo account. Ask them to use a different email for work.' using errcode = 'P0001';
  end if;
  update public.business_invitations set revoked_at = now()
  where business_id = p_business_id and email = v_email and accepted_at is null and revoked_at is null;
  insert into public.business_invitations (business_id, email, full_name, role)
  values (p_business_id, v_email, nullif(trim(p_full_name), ''), p_role)
  returning * into v;
  return v;
end;
$$;

create function public.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business uuid;
begin
  select business_id into v_business from public.business_invitations where id = p_invitation_id;
  if v_business is null or not public.is_business_member(v_business) then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.business_invitations set revoked_at = now() where id = p_invitation_id and accepted_at is null;
end;
$$;

-- New-user trigger: an invited person joins the inviting business instead of getting their own.
-- Sign-up metadata is untrusted: the token must match a live invitation for this exact email.
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
begin
  if v_meta ? 'invite_token' then
    select * into v_invite from public.business_invitations
    where token = v_meta ->> 'invite_token' and email = lower(new.email)
      and accepted_at is null and revoked_at is null and expires_at > now();
  end if;

  if v_invite.id is not null then
    insert into public.profiles (id, role, full_name, email)
    values (new.id, 'provider', coalesce(nullif(left(trim(v_meta ->> 'full_name'), 120), ''), v_invite.full_name), new.email);
    insert into public.business_members (business_id, user_id, role) values (v_invite.business_id, new.id, v_invite.role);
    update public.business_invitations set accepted_at = now() where id = v_invite.id;
    perform public.notify_business(v_invite.business_id, 'team_joined', 'A team member joined',
      coalesce(v_invite.full_name, new.email) || ' accepted your invitation.', '/provider/employees');
    return new;
  end if;

  v_role := case when v_meta ->> 'role' = 'provider' then 'provider'::public.app_role else 'customer'::public.app_role end;
  insert into public.profiles (id, role, full_name, email)
  values (new.id, v_role, nullif(left(trim(v_meta ->> 'full_name'), 120), ''), new.email);

  if v_role = 'provider' then
    v_business_name := nullif(left(trim(v_meta ->> 'business_name'), 120), '');
    v_marketplace   := coalesce((v_meta ->> 'marketplace_enabled')::boolean, false);
    select id into v_plan_id from public.plans where is_default and is_active limit 1;
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

-- Team management
create function public.set_member_role(p_business_id uuid, p_user_id uuid, p_role public.business_member_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_business_role(p_business_id, array['owner']::public.business_member_role[]) then
    raise exception 'Only the owner can change roles' using errcode = '42501';
  end if;
  if p_role not in ('manager', 'employee') then raise exception 'Invalid role' using errcode = 'P0001'; end if;
  if exists (select 1 from public.business_members where business_id = p_business_id and user_id = p_user_id and role = 'owner') then
    raise exception 'The owner''s role can''t be changed' using errcode = 'P0001';
  end if;
  update public.business_members set role = p_role where business_id = p_business_id and user_id = p_user_id;
end;
$$;

create function public.remove_member(p_business_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.business_member_role;
begin
  select role into v_target from public.business_members where business_id = p_business_id and user_id = p_user_id;
  if v_target is null then raise exception 'Not on this team' using errcode = 'P0001'; end if;
  if v_target = 'owner' then raise exception 'The owner can''t be removed' using errcode = 'P0001'; end if;
  if not (public.has_business_role(p_business_id, array['owner']::public.business_member_role[])
          or (v_target = 'employee' and public.is_business_member(p_business_id))) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  delete from public.job_assignments where business_id = p_business_id and user_id = p_user_id;
  update public.recurring_schedules set default_assignee = null where business_id = p_business_id and default_assignee = p_user_id;
  delete from public.business_members where business_id = p_business_id and user_id = p_user_id;
  -- Their login stays (they may have other uses), but they no longer see anything of this business.
end;
$$;

-- Invitation lookup for the invite email link (server only).
create function public.invitation_by_token(p_token text)
returns table (business_name text, email text, role public.business_member_role, valid boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select b.name, i.email, i.role, (i.accepted_at is null and i.revoked_at is null and i.expires_at > now())
  from public.business_invitations i join public.businesses b on b.id = i.business_id
  where i.token = p_token and length(p_token) = 48;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'is_business_staff(uuid)', 'job_assignments_before_insert()', 'job_assignments_notify()', 'is_assigned_to_job(uuid)',
    'jobs_auto_assign()', 'jobs_employee_guard()', 'is_assigned_to_customer(uuid)', 'create_invitation(uuid, text, text, public.business_member_role)',
    'revoke_invitation(uuid)', 'set_member_role(uuid, uuid, public.business_member_role)', 'remove_member(uuid, uuid)',
    'invitation_by_token(text)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end;
$$;
grant execute on function public.is_business_staff(uuid) to authenticated;
grant execute on function public.is_assigned_to_job(uuid) to authenticated;
grant execute on function public.is_assigned_to_customer(uuid) to authenticated;
grant execute on function public.create_invitation(uuid, text, text, public.business_member_role) to authenticated;
grant execute on function public.revoke_invitation(uuid) to authenticated;
grant execute on function public.set_member_role(uuid, uuid, public.business_member_role) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant all on public.job_assignments, public.business_invitations to service_role;
