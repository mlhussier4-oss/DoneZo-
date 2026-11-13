-- Owner decision 2026-11-13: customers need an account (email + password) to post a job. Guest (anonymous)
-- sessions from before can still see their jobs and save their account, but can't post new jobs.
drop policy "service_requests: owner creates" on public.service_requests;
create policy "service_requests: owner creates" on public.service_requests for insert to authenticated
  with check (customer_id = (select auth.uid()) and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false));
