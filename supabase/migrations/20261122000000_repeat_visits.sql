-- Owner decision 2026-11-12: after a marketplace job's invoice is sent, the homeowner can ask the same provider for
-- repeat visits (weekly / every 2 weeks / monthly, 2–12 visits, chosen first date). The provider accepts or
-- declines the whole series. On accept every visit becomes its own scheduled job + booking (same price, same
-- arrival time), paid separately with "Mark job completed". Chat stays in the original conversation.

-- Repeat visits are bookings without their own bid, linked to the original booking.
alter table public.bookings alter column bid_id drop not null;
alter table public.bookings add column parent_booking_id uuid references public.bookings (id) on delete cascade;
alter table public.bookings add constraint bookings_bid_or_parent check (bid_id is not null or parent_booking_id is not null);
create index bookings_parent_idx on public.bookings (parent_booking_id) where parent_booking_id is not null;
drop index public.bookings_one_live_per_request;
create unique index bookings_one_live_per_request on public.bookings (request_id)
  where status in ('pending', 'active', 'completed') and parent_booking_id is null;

create table public.repeat_requests (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.bookings (id) on delete cascade,
  business_id   uuid not null references public.businesses (id) on delete cascade,
  customer_id   uuid not null references public.profiles (id) on delete cascade,
  frequency     text not null check (frequency in ('weekly', 'biweekly', 'monthly')),
  visits        int not null check (visits between 2 and 12),
  first_date    date not null,
  arrival_time  time not null,
  price_cents   int not null check (price_cents > 0),
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'canceled')),
  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);
create index repeat_requests_booking_idx on public.repeat_requests (booking_id, created_at desc);
create unique index repeat_requests_one_pending on public.repeat_requests (booking_id) where status = 'pending';

alter table public.repeat_requests enable row level security;
create policy "repeat_requests: participants read" on public.repeat_requests for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_business_member(business_id)) or (select public.is_admin()));
grant select on public.repeat_requests to authenticated;
grant all on public.repeat_requests to service_role;

create function public.repeat_label(p_frequency text)
returns text
language sql
immutable
set search_path = ''
as $$ select case p_frequency when 'weekly' then 'every week' when 'biweekly' then 'every 2 weeks' else 'every month' end; $$;

-- Homeowner: ask for repeat visits (only once the original job's invoice has been sent).
create function public.request_repeat(p_booking_id uuid, p_frequency text, p_visits int, p_first_date date)
returns public.repeat_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  v_tz text;
  v_today date;
  v_time time;
  v_category text;
  v public.repeat_requests;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null or b.customer_id <> auth.uid() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if b.parent_booking_id is not null then raise exception 'Ask from the original job.' using errcode = 'P0001'; end if;
  if b.status not in ('active', 'completed') or not exists (
       select 1 from public.invoices i where i.job_id = b.job_id and i.status in ('sent', 'partially_paid', 'paid')) then
    raise exception 'You can set up repeat visits once the provider has sent your invoice.' using errcode = 'P0001';
  end if;
  if p_frequency not in ('weekly', 'biweekly', 'monthly') then raise exception 'Choose how often.' using errcode = 'P0001'; end if;
  if p_visits is null or p_visits < 2 or p_visits > 12 then raise exception 'Choose between 2 and 12 visits.' using errcode = 'P0001'; end if;
  select timezone into v_tz from public.businesses where id = b.business_id;
  v_today := (now() at time zone coalesce(v_tz, 'America/Chicago'))::date;
  if p_first_date is null or p_first_date <= v_today or p_first_date > v_today + 90 then
    raise exception 'Choose a first visit date within the next 90 days.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.repeat_requests where booking_id = b.id and status = 'pending') then
    raise exception 'You already asked this provider; they''ll reply soon.' using errcode = 'P0001';
  end if;
  v_time := coalesce(
    (b.arrival_at at time zone coalesce(v_tz, 'America/Chicago'))::time,
    (select (j.scheduled_start at time zone coalesce(v_tz, 'America/Chicago'))::time from public.jobs j where j.id = b.job_id),
    time '09:00');
  insert into public.repeat_requests (booking_id, business_id, customer_id, frequency, visits, first_date, arrival_time, price_cents)
  values (b.id, b.business_id, b.customer_id, p_frequency, p_visits, p_first_date, v_time, b.agreed_price_cents)
  returning * into v;
  select c.name into v_category from public.service_requests r join public.service_categories c on c.id = r.category_id where r.id = b.request_id;
  perform public.notify_business(b.business_id, 'repeat_requested', 'A customer wants repeat visits',
    v_category || ' ' || public.repeat_label(p_frequency) || ', ' || p_visits || ' visits at $' || to_char(b.agreed_price_cents / 100.0, 'FM999,999,990.00') || ' each. Accept or decline.',
    '/provider/marketplace/bookings/' || b.id);
  return v;
end;
$$;

-- Provider: accept (schedule every visit) or decline the whole series.
create function public.decide_repeat(p_request_id uuid, p_accept boolean)
returns public.repeat_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.repeat_requests;
  b public.bookings;
  j public.jobs;
  v_tz text;
  v_step interval;
  v_start timestamptz;
  v_job uuid;
  i int;
begin
  select * into v from public.repeat_requests where id = p_request_id for update;
  if v.id is null or not public.is_business_member(v.business_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if v.status <> 'pending' then raise exception 'This request was already answered.' using errcode = 'P0001'; end if;
  if not p_accept then
    update public.repeat_requests set status = 'declined', decided_at = now() where id = v.id returning * into v;
    perform public.notify(v.customer_id, 'repeat_declined', 'Repeat visits declined',
      'Your provider can''t take on those repeat visits. You can post a new job any time.', '/customer');
    return v;
  end if;

  select * into b from public.bookings where id = v.booking_id;
  select * into j from public.jobs where id = b.job_id;
  select timezone into v_tz from public.businesses where id = v.business_id;
  v_step := case v.frequency when 'weekly' then interval '7 days' when 'biweekly' then interval '14 days' else interval '1 month' end;
  -- Marketplace work: create the visits on any plan (Basic included).
  perform set_config('donezo.system_write', 'on', true);
  for i in 0 .. v.visits - 1 loop
    v_start := ((v.first_date + i * v_step)::date + v.arrival_time) at time zone coalesce(v_tz, 'America/Chicago');
    insert into public.jobs (business_id, customer_id, address_id, category_id, title, description, price_cents, status, source, scheduled_start)
    values (v.business_id, j.customer_id, j.address_id, j.category_id, j.title || ' (repeat visit ' || (i + 1) || ' of ' || v.visits || ')',
            j.description, v.price_cents, 'scheduled', 'marketplace', v_start)
    returning id into v_job;
    insert into public.bookings (request_id, bid_id, parent_booking_id, business_id, customer_id, crm_customer_id, job_id,
                                 agreed_price_cents, original_price_cents, scope, status, confirmed_at, arrival_at)
    values (b.request_id, null, b.id, b.business_id, b.customer_id, b.crm_customer_id, v_job,
            v.price_cents, v.price_cents, b.scope, 'active', now(), v_start);
  end loop;
  perform set_config('donezo.system_write', 'off', true);
  update public.repeat_requests set status = 'accepted', decided_at = now() where id = v.id returning * into v;
  perform public.notify(v.customer_id, 'repeat_accepted', 'Repeat visits confirmed',
    v.visits || ' visits ' || public.repeat_label(v.frequency) || ', starting ' || to_char(v.first_date, 'Mon FMDD') || '.', '/customer');
  return v;
end;
$$;

-- Homeowner: withdraw a request the provider hasn't answered yet.
create function public.cancel_repeat(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.repeat_requests set status = 'canceled', decided_at = now()
  where id = p_request_id and customer_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Nothing to cancel.' using errcode = 'P0001'; end if;
end;
$$;

revoke all on function public.request_repeat(uuid, text, int, date), public.decide_repeat(uuid, boolean), public.cancel_repeat(uuid), public.repeat_label(text) from public, anon;
grant execute on function public.request_repeat(uuid, text, int, date), public.decide_repeat(uuid, boolean), public.cancel_repeat(uuid), public.repeat_label(text) to authenticated;

-- The customer's view: the original booking (never a repeat visit), plus its repeat request and visits.
create or replace function public.customer_booking(p_request_id uuid)
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
    'confirm_by', bk.confirm_by, 'confirmed_at', bk.confirmed_at, 'arrival_at', bk.arrival_at, 'extensions', bk.extensions,
    'server_now', now(),
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
    'review', (select jsonb_build_object('rating', rv.rating, 'comment', rv.comment) from public.reviews rv where rv.booking_id = bk.id),
    'repeat_request', (select jsonb_build_object('id', rr.id, 'status', rr.status, 'frequency', rr.frequency, 'visits', rr.visits,
                                                  'first_date', rr.first_date, 'price_cents', rr.price_cents)
                       from public.repeat_requests rr where rr.booking_id = bk.id order by rr.created_at desc limit 1),
    'visits', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'status', v.status, 'scheduled_start', vj.scheduled_start,
                                  'job_status', vj.status,
                                  'invoice', (select jsonb_build_object('status', i.status, 'token', i.public_token,
                                                'balance_cents', i.total_cents - i.amount_paid_cents)
                                              from public.invoices i where i.job_id = v.job_id and i.status not in ('draft', 'void')
                                              order by i.created_at desc limit 1))
                                  order by vj.scheduled_start)
                        from public.bookings v join public.jobs vj on vj.id = v.job_id
                        where v.parent_booking_id = bk.id), '[]'::jsonb)
  )
  from public.bookings bk
  join public.businesses b on b.id = bk.business_id
  where bk.request_id = p_request_id and bk.customer_id = (select auth.uid()) and bk.status <> 'lapsed' and bk.parent_booking_id is null
  order by bk.created_at desc
  limit 1;
$$;
