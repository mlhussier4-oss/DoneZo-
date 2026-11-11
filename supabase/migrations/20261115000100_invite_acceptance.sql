-- Invitations: Supabase creates the invited person's login when the invite email is SENT.
-- They should join the team only when they ACCEPT (click the link, which confirms their email).

create or replace function public.accept_invitation_for(p_user_id uuid, p_email text, p_meta jsonb, p_full_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.business_invitations;
begin
  -- The token must match a live invitation for this exact email; confirming the email proves they own it.
  select * into v_invite from public.business_invitations
  where token = p_meta ->> 'invite_token' and email = lower(p_email)
    and accepted_at is null and revoked_at is null and expires_at > now();
  if v_invite.id is null then
    -- Re-sent invite to the same not-yet-accepted login: Supabase keeps the first token, so use the newest live one.
    select * into v_invite from public.business_invitations
    where email = lower(p_email) and accepted_at is null and revoked_at is null and expires_at > now()
    order by created_at desc limit 1;
  end if;
  if v_invite.id is null then return; end if;
  if exists (select 1 from public.business_members where user_id = p_user_id) then return; end if;
  update public.profiles set full_name = coalesce(full_name, v_invite.full_name) where id = p_user_id;
  insert into public.business_members (business_id, user_id, role) values (v_invite.business_id, p_user_id, v_invite.role);
  update public.business_invitations set accepted_at = now() where id = v_invite.id;
  perform public.notify_business(v_invite.business_id, 'team_joined', 'A team member joined',
    coalesce(p_full_name, v_invite.full_name, p_email) || ' accepted your invitation.', '/provider/employees');
end;
$$;
revoke all on function public.accept_invitation_for(uuid, text, jsonb, text) from public, anon, authenticated;

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

-- When an invited person clicks the link, Supabase confirms their email: that is the moment they join.
create function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null
     and coalesce(new.raw_user_meta_data, '{}'::jsonb) ? 'invite_token'
     and exists (select 1 from public.profiles where id = new.id and role = 'provider') then
    perform public.accept_invitation_for(new.id, new.email, new.raw_user_meta_data,
      nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 120), ''));
  end if;
  return null;
end;
$$;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_confirmed();

-- An invited login that was never accepted (no team, email unconfirmed) doesn't block a new invitation.
create or replace function public.is_unaccepted_invitee(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from auth.users u
  where lower(u.email) = lower(trim(p_email)) and u.email_confirmed_at is null
    and coalesce(u.raw_user_meta_data, '{}'::jsonb) ? 'invite_token'
    and not exists (select 1 from public.business_members m where m.user_id = u.id)
  limit 1;
$$;
revoke all on function public.is_unaccepted_invitee(text) from public, anon, authenticated;
grant execute on function public.is_unaccepted_invitee(text) to service_role;

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
