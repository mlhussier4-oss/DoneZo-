-- Owner decision 2026-11-14: provider referrals. Every 2 providers who sign up with your link and make their first
-- Stripe-verified subscription payment = 1 free month of YOUR current plan (6 paying referrals = 3 free months).
-- The free month is a credit on the referrer's Stripe customer balance, used automatically on their next bill(s).
-- A referral whose first payment is refunded before it has been used toward a reward stops counting.

-- Each business has a short, shareable code.
create function public.new_referral_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 7);
$$;

alter table public.businesses
  add column referral_code text unique default public.new_referral_code(),
  add column referred_by uuid references public.businesses (id) on delete set null;
update public.businesses set referral_code = public.new_referral_code() where referral_code is null;
alter table public.businesses alter column referral_code set not null;
alter table public.businesses add constraint businesses_no_self_referral check (referred_by is null or referred_by <> id);

-- Sign-up: the referral code travels in user metadata; record who referred the new business.
create function public.record_signup_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if new.created_by is not null and new.referred_by is null then
    select upper(nullif(trim(u.raw_user_meta_data ->> 'referral_code'), '')) into v_code from auth.users u where u.id = new.created_by;
    if v_code is not null then
      select id into new.referred_by from public.businesses where referral_code = v_code;
    end if;
  end if;
  return new;
end;
$$;
create trigger businesses_signup_referral before insert on public.businesses
  for each row execute function public.record_signup_referral();
revoke all on function public.record_signup_referral() from public, anon, authenticated;

create table public.referral_rewards (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,  -- who earns the free month
  amount_cents   int not null check (amount_cents > 0),
  plan_name      text not null,
  status         text not null default 'pending' check (status in ('pending', 'applied', 'failed')),
  stripe_balance_transaction_id text unique,
  error          text,
  created_at     timestamptz not null default now(),
  applied_at     timestamptz
);
create index referral_rewards_business_idx on public.referral_rewards (business_id, created_at desc);

create table public.referrals (
  referred_business_id uuid primary key references public.businesses (id) on delete cascade,
  referrer_business_id uuid not null references public.businesses (id) on delete cascade,
  qualified_at  timestamptz,           -- first Stripe-verified subscription payment
  revoked_at    timestamptz,           -- that payment was refunded before it was used
  reward_id     uuid references public.referral_rewards (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index referrals_referrer_idx on public.referrals (referrer_business_id, qualified_at);

-- Every referred business is tracked from sign-up.
create function public.businesses_track_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.referred_by is not null then
    insert into public.referrals (referred_business_id, referrer_business_id) values (new.id, new.referred_by)
    on conflict do nothing;
  end if;
  return null;
end;
$$;
create trigger businesses_track_referral after insert on public.businesses
  for each row execute function public.businesses_track_referral();
revoke all on function public.businesses_track_referral() from public, anon, authenticated;

alter table public.referral_rewards enable row level security;
alter table public.referrals enable row level security;
-- Owners/managers see their own rewards and the businesses they referred (name and status only, via the function below).
create policy "referral_rewards: members read" on public.referral_rewards for select to authenticated
  using ((select public.is_business_member(business_id)) or (select public.is_admin()));
create policy "referrals: referrer reads" on public.referrals for select to authenticated
  using ((select public.is_business_member(referrer_business_id)) or (select public.is_admin()));
grant select on public.referral_rewards, public.referrals to authenticated;
grant all on public.referral_rewards, public.referrals to service_role;

-- Called by the server after a verified Stripe subscription payment (service role only).
-- Returns the reward created, if this payment completed a pair.
create function public.record_referral_payment(p_business_id uuid)
returns public.referral_rewards
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ref public.referrals;
  v_referrer public.businesses;
  v_plan public.plans;
  v_reward public.referral_rewards;
  v_pair uuid[];
begin
  select * into v_ref from public.referrals where referred_business_id = p_business_id for update;
  if v_ref.referred_business_id is null or v_ref.qualified_at is not null then return null; end if;
  update public.referrals set qualified_at = now() where referred_business_id = p_business_id;

  -- Two qualified, unrevoked, unused referrals make one free month.
  select array_agg(referred_business_id) into v_pair from (
    select referred_business_id from public.referrals
    where referrer_business_id = v_ref.referrer_business_id and qualified_at is not null and revoked_at is null and reward_id is null
    order by qualified_at limit 2 for update
  ) x;
  if coalesce(array_length(v_pair, 1), 0) < 2 then return null; end if;

  select * into v_referrer from public.businesses where id = v_ref.referrer_business_id;
  select * into v_plan from public.plans where id = v_referrer.plan_id;
  insert into public.referral_rewards (business_id, amount_cents, plan_name)
  values (v_referrer.id, v_plan.price_cents, v_plan.name)
  returning * into v_reward;
  update public.referrals set reward_id = v_reward.id where referred_business_id = any (v_pair);
  perform public.notify_business(v_referrer.id, 'referral_reward', 'You earned a free month!',
    'Two providers you referred are now paying. Your next ' || v_plan.name || ' month is on us.', '/provider/referrals');
  return v_reward;
end;
$$;

-- A refunded first payment stops counting, unless it was already used toward a free month.
create function public.revoke_referral_payment(p_business_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.referrals set revoked_at = now()
  where referred_business_id = p_business_id and qualified_at is not null and reward_id is null and revoked_at is null;
$$;

create function public.mark_referral_reward(p_reward_id uuid, p_status text, p_balance_txn text, p_error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.referral_rewards
  set status = p_status, stripe_balance_transaction_id = coalesce(p_balance_txn, stripe_balance_transaction_id),
      error = left(p_error, 500), applied_at = case when p_status = 'applied' then now() else applied_at end
  where id = p_reward_id;
$$;

revoke all on function public.record_referral_payment(uuid), public.revoke_referral_payment(uuid),
  public.mark_referral_reward(uuid, text, text, text), public.new_referral_code() from public, anon, authenticated;
grant execute on function public.record_referral_payment(uuid), public.revoke_referral_payment(uuid),
  public.mark_referral_reward(uuid, text, text, text) to service_role;

-- What a referrer sees about the businesses they referred: name and whether they're paying.
create function public.my_referrals()
returns table (business_name text, signed_up_at timestamptz, paying boolean, counted boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select b.name, r.created_at, r.qualified_at is not null and r.revoked_at is null, r.reward_id is not null
  from public.referrals r
  join public.businesses b on b.id = r.referred_business_id
  where public.is_business_member(r.referrer_business_id)
    and exists (select 1 from public.business_members m where m.business_id = r.referrer_business_id and m.user_id = auth.uid() and m.role in ('owner', 'manager'))
  order by r.created_at desc;
$$;
revoke all on function public.my_referrals() from public, anon;
grant execute on function public.my_referrals() to authenticated;

-- Sign-up page: "Invited by <business name>" (name only; nothing else about the referrer).
create function public.referrer_name(p_code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select name from public.businesses where referral_code = upper(trim(p_code)) and not is_suspended;
$$;
revoke all on function public.referrer_name(text) from public;
grant execute on function public.referrer_name(text) to anon, authenticated;
