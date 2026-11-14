-- Owner requests 2026-11-14:
--  * Friendlier milestone messages: "Congrats on winning your bid!", "Great job completing this job!",
--    "Thank you for being a great customer!" (with a nudge to book the same pro again).
--  * Book again: a customer re-posts a finished job and the pro who did it is invited directly.
--  * Annual plans: pay for 12 months, get 2 free (yearly Stripe prices).

-- 1. Bid won.
do $$
declare r record;
begin
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosrc like '%You were chosen! Confirm within 5 minutes%'
  loop
    execute replace(pg_get_functiondef(r.oid), 'You were chosen! Confirm within 5 minutes', 'Congrats on winning your bid! Confirm within 5 minutes');
  end loop;
end;
$$;

-- 2. Job done: thank both sides.
create function public.bookings_completed_messages()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business text;
  v_first text;
  v_done int;
begin
  if new.status <> 'completed' or old.status = 'completed' then return null; end if;
  select name into v_business from public.businesses where id = new.business_id;
  v_first := public.customer_card(new.customer_id) ->> 'first_name';
  select count(*) into v_done from public.bookings where business_id = new.business_id and status = 'completed';
  perform public.notify_business(new.business_id, 'job_celebration', 'Great job completing this job!',
    'Another happy customer: ' || v_first || '. That''s ' || v_done || ' completed ' || case when v_done = 1 then 'job' else 'jobs' end || ' on HomeHire.',
    '/provider/marketplace/bookings/' || new.id);
  perform public.notify(new.customer_id, 'thank_you', 'Thank you for being a great customer!',
    'Need it done again? Book ' || v_business || ' again in a couple of taps.', '/customer/requests/' || new.request_id);
  return null;
end;
$$;
create trigger bookings_completed_messages after update of status on public.bookings
  for each row execute function public.bookings_completed_messages();
revoke all on function public.bookings_completed_messages() from public, anon, authenticated;

-- 3. Book again: invite the pro from a finished job to bid on the customer's new job.
create function public.invite_past_provider(p_new_request uuid, p_past_request uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business uuid;
  v_new public.service_requests;
  v_category text;
begin
  select * into v_new from public.service_requests where id = p_new_request and customer_id = auth.uid();
  if v_new.id is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  select k.business_id into v_business from public.bookings k
  where k.request_id = p_past_request and k.customer_id = auth.uid() and k.status = 'completed' and k.parent_booking_id is null
  order by k.completed_at desc limit 1;
  if v_business is null or not public.business_can_see_request(v_new.id, v_business) then return false; end if;
  select name into v_category from public.service_categories where id = v_new.category_id;
  perform public.notify_business(v_business, 'book_again',
    (public.customer_card(auth.uid()) ->> 'first_name') || ' wants to book you again',
    'A past customer posted a new ' || lower(v_category) || ' job and asked for you. Send your bid.',
    '/provider/marketplace/requests/' || v_new.id);
  return true;
end;
$$;
revoke all on function public.invite_past_provider(uuid, uuid) from public, anon;
grant execute on function public.invite_past_provider(uuid, uuid) to authenticated;

-- 4. Annual plans.
alter table public.plans add column stripe_yearly_lookup_key text unique;
update public.plans set stripe_yearly_lookup_key = replace(stripe_lookup_key, '_monthly', '_yearly') where stripe_lookup_key like '%\_monthly';

create or replace function public.set_business_plan_by_lookup_key(p_business_id uuid, p_lookup_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_plan uuid;
begin
  select id into v_plan from public.plans where stripe_lookup_key = p_lookup_key or stripe_yearly_lookup_key = p_lookup_key;
  if v_plan is null then raise exception 'Unknown plan price %', p_lookup_key; end if;
  update public.businesses set plan_id = v_plan, marketplace_enabled = case when (select code from public.plans where id = v_plan) = 'basic' then true else marketplace_enabled end,
    marketplace_enabled_at = case when (select code from public.plans where id = v_plan) = 'basic' and not marketplace_enabled then now() else marketplace_enabled_at end
  where id = p_business_id;
end;
$$;
