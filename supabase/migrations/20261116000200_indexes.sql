-- Phase 6 performance: indexes for lookups that pages, reports and security rules do often.
-- (Customer pages, invoice/estimate lists per customer, reports by completion date, support rate limit.)
create index if not exists estimates_customer_idx          on public.estimates (customer_id, issue_date desc);
create index if not exists estimates_job_idx               on public.estimates (job_id) where job_id is not null;
create index if not exists invoices_customer_idx           on public.invoices (customer_id, issue_date desc);
create index if not exists invoices_estimate_idx           on public.invoices (estimate_id) where estimate_id is not null;
create index if not exists jobs_address_idx                on public.jobs (address_id) where address_id is not null;
create index if not exists jobs_completed_idx              on public.jobs (business_id, completed_at) where status = 'completed';
create index if not exists payment_records_customer_idx    on public.payment_records (customer_id, received_on desc);
create index if not exists payment_records_job_idx         on public.payment_records (job_id) where job_id is not null;
create index if not exists recurring_schedules_customer_idx on public.recurring_schedules (customer_id);
create index if not exists support_reports_reporter_idx    on public.support_reports (reporter_id, created_at desc);
create index if not exists bookings_crm_customer_idx       on public.bookings (crm_customer_id);
create index if not exists crm_customers_profile_idx       on public.crm_customers (profile_id) where profile_id is not null;
create index if not exists reviews_customer_idx            on public.reviews (customer_id);
create index if not exists job_assignments_job_idx         on public.job_assignments (business_id, user_id);
