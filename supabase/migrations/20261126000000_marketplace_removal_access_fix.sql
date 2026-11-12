-- Fix: businesses.is_suspended is only set by admin_set_marketplace_removed, which promises that business
-- tools keep working. It must therefore not block paid access; it only blocks the marketplace (job board,
-- bidding, being picked). Whole-account suspension remains profiles.is_suspended.
create or replace function public.business_has_access(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_subscriptions s
    where s.business_id = p_business_id and s.status in ('active', 'trialing', 'past_due')
  );
$$;
