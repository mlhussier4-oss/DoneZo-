-- Owner request 2026-11-28: show on the admin dashboard where each sign-up came from.
-- The website copies the visitor's first-visit record (ad tags, referring site, landing page, referral code) into the
-- new account's metadata as `signup_source`; this trigger saves it. Only admins can read it (admin_signup_sources).

create table public.signup_sources (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('customer', 'provider')),
  source text, medium text, campaign text, content text, referrer text, landing text, ref text,
  created_at timestamptz not null default now()
);
create index signup_sources_created_at on public.signup_sources (created_at);
alter table public.signup_sources enable row level security;
revoke all on public.signup_sources from anon, authenticated;

create function public.record_signup_source()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  s jsonb := coalesce(new.raw_user_meta_data -> 'signup_source', '{}'::jsonb);
  t text;
begin
  -- Team invitations aren't sign-ups.
  if new.raw_user_meta_data ? 'invite_token' then return new; end if;
  if jsonb_typeof(s) <> 'object' then s := '{}'::jsonb; end if;
  insert into public.signup_sources (user_id, role, source, medium, campaign, content, referrer, landing, ref)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'provider' then 'provider' else 'customer' end,
    left(s ->> 'source', 80), left(s ->> 'medium', 80), left(s ->> 'campaign', 80), left(s ->> 'content', 80),
    left(s ->> 'referrer', 60), left(s ->> 'landing', 120), left(s ->> 'ref', 12)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.record_signup_source() from public, anon, authenticated;
create trigger on_auth_user_signup_source after insert on auth.users
  for each row execute function public.record_signup_source();

-- Plain-English channel for a sign-up.
create function public.signup_channel(p_source text, p_medium text, p_referrer text, p_ref text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_source is not null then
      case
        when p_source in ('fb', 'facebook', 'meta') then 'Facebook'
        when p_source in ('ig', 'instagram') then 'Instagram'
        when p_source = 'tiktok' then 'TikTok'
        when p_source = 'google' then 'Google'
        when p_source = 'nextdoor' then 'Nextdoor'
        else initcap(replace(p_source, '_', ' '))
      end || case when p_medium in ('paid', 'cpc', 'ppc', 'ads', 'ad', 'paid_social', 'paidsocial') then ' ads' else '' end
    when p_ref is not null then 'Pro referral link'
    when p_referrer ~ '(^|\.)google\.' then 'Google search'
    when p_referrer ~ '(^|\.)(facebook\.com|fb\.com|fb\.me|m\.facebook\.com)$' or p_referrer like '%facebook%' then 'Facebook'
    when p_referrer like '%instagram%' then 'Instagram'
    when p_referrer like '%nextdoor%' then 'Nextdoor'
    when p_referrer like '%tiktok%' then 'TikTok'
    when p_referrer ~ '(bing|duckduckgo|yahoo)\.' then 'Other search engines'
    when p_referrer is not null then p_referrer
    else 'Direct (typed in, bookmark or QR code)'
  end;
$$;

-- Admin only: sign-ups by channel and by campaign for the last p_days days (0 = all time), with how many went on
-- to post a job (customers) or pay for a plan (providers).
create function public.admin_signup_sources(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  with base as (
    select s.*, public.signup_channel(s.source, s.medium, s.referrer, s.ref) as channel,
      (select m.business_id from public.business_members m where m.user_id = s.user_id and m.role = 'owner' limit 1) as business_id
    from public.signup_sources s
    join public.profiles p on p.id = s.user_id
    where not p.is_review_account and p.role <> 'admin'
      and (p_days <= 0 or s.created_at > now() - make_interval(days => p_days))
  ),
  scored as (
    select b.*,
      (b.role = 'customer' and exists (select 1 from public.service_requests r where r.customer_id = b.user_id)) as posted,
      (b.role = 'provider' and b.business_id is not null and exists (select 1 from public.subscription_payments sp where sp.business_id = b.business_id)) as paying,
      (b.role = 'provider' and b.business_id is not null and public.business_has_access(b.business_id)) as subscribed
    from base b
  )
  select jsonb_build_object(
    'days', p_days,
    'total', (select count(*) from scored),
    'channels', coalesce((select jsonb_agg(x order by (x ->> 'signups')::int desc) from (
      select jsonb_build_object('channel', channel, 'signups', count(*),
        'customers', count(*) filter (where role = 'customer'), 'posted', count(*) filter (where posted),
        'providers', count(*) filter (where role = 'provider'), 'subscribed', count(*) filter (where subscribed),
        'paying', count(*) filter (where paying)) x
      from scored group by channel) q), '[]'::jsonb),
    'campaigns', coalesce((select jsonb_agg(x order by (x ->> 'signups')::int desc) from (
      select jsonb_build_object('campaign', campaign, 'source', source, 'medium', medium, 'signups', count(*),
        'customers', count(*) filter (where role = 'customer'), 'posted', count(*) filter (where posted),
        'providers', count(*) filter (where role = 'provider'), 'paying', count(*) filter (where paying)) x
      from scored where campaign is not null group by campaign, source, medium order by count(*) desc limit 15) q), '[]'::jsonb)
  ) into v;
  return v;
end;
$$;
revoke all on function public.admin_signup_sources(integer) from public, anon;
grant execute on function public.admin_signup_sources(integer) to authenticated;
