-- Owner decision 2026-11-14: cancellation meter for customers and providers.
-- Each cancellation after the provider has confirmed a booking is a strike: 1 = yellow, 2 = orange, 3 = red.
-- A 3rd strike within 6 months removes marketplace access (customers can't post or pick bids; providers are removed
-- from the marketplace) until an admin restores it, which also clears the meter. "Report a problem" gains
-- "Provider cancelled" / "Customer cancelled"; an admin can count such a report as a strike after checking it.

create table public.cancellation_strikes (
  id           uuid primary key default gen_random_uuid(),
  party        text not null check (party in ('customer', 'provider')),
  customer_id  uuid references public.profiles (id) on delete cascade,
  business_id  uuid references public.businesses (id) on delete cascade,
  booking_id   uuid references public.bookings (id) on delete set null,
  source       text not null check (source in ('cancel', 'report')),
  report_id    uuid unique references public.support_reports (id) on delete set null,
  voided_at    timestamptz,
  created_at   timestamptz not null default now(),
  check ((party = 'customer' and customer_id is not null) or (party = 'provider' and business_id is not null))
);
create index cancellation_strikes_customer_idx on public.cancellation_strikes (customer_id, created_at) where voided_at is null;
create index cancellation_strikes_business_idx on public.cancellation_strikes (business_id, created_at) where voided_at is null;
alter table public.cancellation_strikes enable row level security;
create policy "cancellation_strikes: own or admin" on public.cancellation_strikes for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_business_member(business_id)) or (select public.is_admin()));
grant select on public.cancellation_strikes to authenticated;
grant all on public.cancellation_strikes to service_role;

alter table public.profiles add column marketplace_blocked_at timestamptz;

create function public.strike_count(p_customer uuid, p_business uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.cancellation_strikes
  where voided_at is null and created_at > now() - interval '6 months'
    and ((p_customer is not null and customer_id = p_customer) or (p_business is not null and business_id = p_business));
$$;
revoke all on function public.strike_count(uuid, uuid) from public, anon, authenticated;

create function public.record_cancellation_strike(p_party text, p_customer uuid, p_business uuid, p_booking uuid, p_source text, p_report uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  insert into public.cancellation_strikes (party, customer_id, business_id, booking_id, source, report_id)
  values (p_party, p_customer, p_business, p_booking, p_source, p_report);
  n := public.strike_count(p_customer, p_business);
  if n >= 3 then
    if p_party = 'customer' then
      update public.profiles set marketplace_blocked_at = now() where id = p_customer and marketplace_blocked_at is null;
      perform public.notify(p_customer, 'cancellations_red', 'Marketplace access paused',
        'You''ve cancelled 3 confirmed jobs within 6 months, so you can''t post or book jobs for now. Contact support to talk it through.', '/help');
    else
      update public.businesses set is_suspended = true, marketplace_removed_reason = '3 cancellations within 6 months' where id = p_business;
      update public.bids set status = 'withdrawn', updated_at = now() where business_id = p_business and status = 'submitted';
      perform public.notify_business(p_business, 'cancellations_red', 'Marketplace access removed',
        'Your business cancelled 3 confirmed jobs within 6 months, so it has been removed from the marketplace. Your business tools still work. Contact support to talk it through.', '/help');
    end if;
  elsif n = 2 then
    if p_party = 'customer' then
      perform public.notify(p_customer, 'cancellations_orange', 'Second cancellation (orange)',
        'You''ve cancelled 2 confirmed jobs within 6 months. One more and you''ll lose access to the marketplace.', '/customer');
    else
      perform public.notify_business(p_business, 'cancellations_orange', 'Second cancellation (orange)',
        'Your business has cancelled 2 confirmed jobs within 6 months. One more and you''ll lose access to the marketplace.', '/provider/marketplace');
    end if;
  else
    if p_party = 'customer' then
      perform public.notify(p_customer, 'cancellations_yellow', 'Cancellation noted (yellow)',
        'Cancelling after a pro confirms counts on your record. 3 within 6 months pauses your access to the marketplace.', '/customer');
    else
      perform public.notify_business(p_business, 'cancellations_yellow', 'Cancellation noted (yellow)',
        'Cancelling after confirming a job counts on your record. 3 within 6 months removes your business from the marketplace.', '/provider/marketplace');
    end if;
  end if;
end;
$$;
revoke all on function public.record_cancellation_strike(text, uuid, uuid, uuid, text, uuid) from public, anon, authenticated;

-- Blocked customers can't post new jobs or pick a bid.
create function public.customer_blocked(p_customer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select exists (select 1 from public.profiles where id = p_customer and marketplace_blocked_at is not null); $$;
revoke all on function public.customer_blocked(uuid) from public, anon, authenticated;

create function public.service_requests_customer_not_blocked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.customer_blocked(new.customer_id) then
    raise exception 'Your marketplace access is paused after 3 cancellations within 6 months. Contact support.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger service_requests_customer_not_blocked before insert on public.service_requests
  for each row execute function public.service_requests_customer_not_blocked();

create function public.bookings_customer_not_blocked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.parent_booking_id is null and public.customer_blocked(new.customer_id) then
    raise exception 'Your marketplace access is paused after 3 cancellations within 6 months. Contact support.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger bookings_customer_not_blocked before insert on public.bookings
  for each row execute function public.bookings_customer_not_blocked();
revoke all on function public.service_requests_customer_not_blocked(), public.bookings_customer_not_blocked() from public, anon, authenticated;

-- What each person sees about their own meter.
create function public.my_cancellation_record()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'customer', jsonb_build_object('count', public.strike_count(auth.uid(), null),
                                   'blocked', (select marketplace_blocked_at is not null from public.profiles where id = auth.uid())),
    'business', (select jsonb_build_object('count', public.strike_count(null, m.business_id), 'removed', b.is_suspended)
                 from public.business_members m join public.businesses b on b.id = m.business_id
                 where m.user_id = auth.uid() limit 1)
  );
$$;
revoke all on function public.my_cancellation_record() from public, anon;
grant execute on function public.my_cancellation_record() to authenticated;

-- Report categories.
alter table public.support_reports drop constraint support_reports_category_check;
alter table public.support_reports add constraint support_reports_category_check
  check (category in ('problem_with_job', 'payment', 'safety', 'account', 'privacy', 'question', 'other', 'provider_cancelled', 'customer_cancelled'));

-- Admin: count a "Provider cancelled" / "Customer cancelled" report as a strike, after checking it.
create function public.admin_strike_from_report(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.support_reports;
  b public.bookings;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into r from public.support_reports where id = p_report_id;
  if r.id is null or r.booking_id is null or r.category not in ('provider_cancelled', 'customer_cancelled') then
    raise exception 'This report isn''t about a cancelled booking.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.cancellation_strikes where report_id = r.id) then return; end if;
  select * into b from public.bookings where id = r.booking_id;
  if r.category = 'provider_cancelled' then
    perform public.record_cancellation_strike('provider', null, b.business_id, b.id, 'report', r.id);
  else
    perform public.record_cancellation_strike('customer', b.customer_id, null, b.id, 'report', r.id);
  end if;
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'strike.from_report', 'support_report', r.id::text, jsonb_build_object('category', r.category));
end;
$$;

-- Admin: restore a customer's marketplace access (clears their meter).
create function public.admin_restore_customer_marketplace(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.profiles set marketplace_blocked_at = null where id = p_user_id;
  update public.cancellation_strikes set voided_at = now() where customer_id = p_user_id and voided_at is null;
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'customer.marketplace_restore', 'profile', p_user_id::text, '{}'::jsonb);
end;
$$;
revoke all on function public.admin_strike_from_report(uuid), public.admin_restore_customer_marketplace(uuid) from public, anon;
grant execute on function public.admin_strike_from_report(uuid), public.admin_restore_customer_marketplace(uuid) to authenticated;

-- Restoring a provider's marketplace access also clears their meter.
create function public.businesses_restore_clears_strikes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_suspended and not new.is_suspended then
    update public.cancellation_strikes set voided_at = now() where business_id = new.id and voided_at is null;
  end if;
  return null;
end;
$$;
create trigger businesses_restore_clears_strikes after update of is_suspended on public.businesses
  for each row execute function public.businesses_restore_clears_strikes();
revoke all on function public.businesses_restore_clears_strikes() from public, anon, authenticated;

create or replace function public.cancel_booking(p_booking_id uuid, p_reason text)
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
  -- A cancellation after the pro confirmed counts toward the canceller's meter (owner decision 2026-11-14).
  if v_is_customer then
    perform public.record_cancellation_strike('customer', v.customer_id, null, v.id, 'cancel');
  else
    perform public.record_cancellation_strike('provider', null, v.business_id, v.id, 'cancel');
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

