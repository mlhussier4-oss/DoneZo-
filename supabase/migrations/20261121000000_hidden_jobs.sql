-- Owner request 2026-11-12: providers can hide a job on their board so it stops showing.
-- Private to the provider's business; the customer and other providers are unaffected.
create table public.hidden_requests (
  business_id uuid not null references public.businesses (id) on delete cascade,
  request_id  uuid not null references public.service_requests (id) on delete cascade,
  hidden_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  primary key (business_id, request_id)
);
create index hidden_requests_request_idx on public.hidden_requests (request_id);

alter table public.hidden_requests enable row level security;
create policy "hidden_requests: business manages" on public.hidden_requests for all to authenticated
  using ((select public.is_business_member(business_id))) with check ((select public.is_business_member(business_id)));
grant select, insert (business_id, request_id), delete on public.hidden_requests to authenticated;
grant all on public.hidden_requests to service_role;
