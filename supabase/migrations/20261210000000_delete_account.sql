-- Owner request 2026-11-15 (Apple App Store requirement): people can delete their HomeHire account from the app/site.
-- Deleting removes personal information and the login. Records the other side relies on (a provider's invoices,
-- payments and job history; a customer's receipts) are kept but no longer identify the deleted person.
alter table public.profiles add column deleted_at timestamptz;
alter table public.businesses add column deleted_at timestamptz;

create function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  p public.profiles;
  m public.business_members;
  v_avatar text;
  v_sub text;
begin
  select * into p from public.profiles where id = v_uid for update;
  if p.id is null or p.deleted_at is not null then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p.role = 'admin' then raise exception 'Admin accounts are removed by another admin.' using errcode = 'P0001'; end if;
  v_avatar := p.avatar_path;

  if p.role = 'customer' then
    if exists (select 1 from public.bookings where customer_id = v_uid and status in ('pending', 'active')) then
      raise exception 'You have a job in progress. Finish or cancel it first, then delete your account.' using errcode = 'P0001';
    end if;
    update public.service_requests set status = 'canceled', canceled_at = now() where customer_id = v_uid and status = 'open';
  else
    select * into m from public.business_members where user_id = v_uid limit 1;
    if m.role = 'owner' then
      if exists (select 1 from public.business_members where business_id = m.business_id and user_id <> v_uid) then
        raise exception 'Remove your team members first (Team page), then delete your account.' using errcode = 'P0001';
      end if;
      if exists (select 1 from public.bookings where business_id = m.business_id and status in ('pending', 'active')) then
        raise exception 'You have a marketplace job in progress. Finish or cancel it first, then delete your account.' using errcode = 'P0001';
      end if;
      update public.bids set status = 'withdrawn', updated_at = now() where business_id = m.business_id and status = 'submitted';
      update public.businesses set is_suspended = true, marketplace_enabled = false, deleted_at = now(),
        marketplace_removed_reason = 'Account deleted', name = 'Deleted business', email = null, phone = null,
        description = null, logo_path = null
      where id = m.business_id;
      select stripe_subscription_id into v_sub from public.business_subscriptions where business_id = m.business_id;
    elsif m.business_id is not null then
      delete from public.business_members where business_id = m.business_id and user_id = v_uid;
    end if;
  end if;

  delete from public.push_subscriptions where user_id = v_uid;
  delete from public.notifications where user_id = v_uid;
  update public.profiles set full_name = 'Deleted user', email = null, phone = null, avatar_path = null, deleted_at = now()
  where id = v_uid;
  return jsonb_build_object('avatar_path', v_avatar, 'stripe_subscription_id', v_sub);
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
