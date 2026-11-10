-- A business that has bid on a request may keep reading that request's own row (service, description,
-- timing, ZIP): it saw all of this when it bid. The customer's name, address and phone stay in
-- service_request_locations / profiles, which remain hidden until a bid is accepted.
--
-- The check runs in a SECURITY DEFINER function: the bids table's own policy reads service_requests,
-- so checking bids directly from a service_requests policy would loop.
create function public.current_user_bid_on(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bids b
    join public.business_members m on m.business_id = b.business_id
    where b.request_id = p_request_id and m.user_id = (select auth.uid())
  );
$$;
revoke execute on function public.current_user_bid_on(uuid) from public, anon;
grant execute on function public.current_user_bid_on(uuid) to authenticated, service_role;

create policy "service_requests: bidders read" on public.service_requests for select to authenticated
  using ((select public.current_user_bid_on(id)));
