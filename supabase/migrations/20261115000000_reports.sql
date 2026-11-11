-- Phase 5: refunds no longer count as revenue on the overview; date-range reports and CSV export.

-- Overview figures: net of refunds.
create or replace function public.business_dashboard(p_business_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_today date;
  v_month_start date;
  v_week_start date;
  v_result jsonb;
begin
  if not (public.is_business_member(p_business_id) or public.is_admin()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select timezone into v_tz from public.businesses where id = p_business_id;
  v_today := (now() at time zone v_tz)::date;
  v_month_start := date_trunc('month', v_today)::date;
  v_week_start := date_trunc('week', v_today)::date; -- Monday

  select jsonb_build_object(
    'today', v_today,
    'revenue_month_cents', (select coalesce(sum(amount_cents - refunded_cents), 0) from public.payment_records
                            where business_id = p_business_id and received_on >= v_month_start),
    'revenue_week_cents', (select coalesce(sum(amount_cents - refunded_cents), 0) from public.payment_records
                           where business_id = p_business_id and received_on >= v_week_start),
    'completed_jobs_month', (select count(*) from public.jobs where business_id = p_business_id
                             and status = 'completed' and (completed_at at time zone v_tz)::date >= v_month_start),
    'upcoming_jobs_7d', (select count(*) from public.jobs where business_id = p_business_id
                         and status in ('new', 'scheduled') and scheduled_start >= now()
                         and scheduled_start < ((v_today + 8)::timestamp at time zone v_tz)),
    'new_customers_month', (select count(*) from public.crm_customers where business_id = p_business_id
                            and (created_at at time zone v_tz)::date >= v_month_start),
    'active_customers', (select count(*) from public.crm_customers where business_id = p_business_id and not is_archived),
    'repeat_customers', (select count(*) from (
                           select customer_id from public.jobs where business_id = p_business_id and status = 'completed'
                           group by customer_id having count(*) >= 2) t),
    'outstanding_invoices', (select count(*) from public.invoices where business_id = p_business_id
                             and status in ('sent', 'partially_paid')),
    'outstanding_cents', (select coalesce(sum(total_cents - amount_paid_cents), 0) from public.invoices
                          where business_id = p_business_id and status in ('sent', 'partially_paid')),
    'average_job_cents', (select coalesce(round(avg(price_cents))::int, 0) from public.jobs
                          where business_id = p_business_id and status = 'completed'
                          and completed_at >= now() - interval '90 days'),
    'revenue_by_category', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'cents', cents) order by cents desc)
      from (
        select coalesce(sc.name, 'Uncategorized') as name, sum(pr.amount_cents - pr.refunded_cents) as cents
        from public.payment_records pr
        left join public.invoices i on i.id = pr.invoice_id
        left join public.jobs j on j.id = coalesce(pr.job_id, i.job_id)
        left join public.service_categories sc on sc.id = j.category_id
        where pr.business_id = p_business_id and pr.received_on >= v_today - 365
        group by 1
      ) t), '[]'::jsonb),
    'revenue_by_month', coalesce((
      select jsonb_agg(jsonb_build_object('month', to_char(m, 'YYYY-MM'), 'cents', coalesce(cents, 0)) order by m)
      from generate_series(date_trunc('month', v_today) - interval '5 months', date_trunc('month', v_today), interval '1 month') m
      left join (
        select date_trunc('month', received_on) as month, sum(amount_cents - refunded_cents) as cents
        from public.payment_records where business_id = p_business_id group by 1
      ) r on r.month = m), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

-- =====================================================================
-- Phase 5: advanced reports for a date range (owners and managers only)
-- Revenue = payments received in the range, minus anything refunded.
-- =====================================================================
create function public.business_report(p_business_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_today date;
  v_days int;
  v_unit text;
  v_result jsonb;
begin
  if not (public.is_business_member(p_business_id) or public.is_admin()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Choose a valid date range' using errcode = '22023';
  end if;
  if p_to - p_from > 366 * 3 then
    raise exception 'Choose a range of 3 years or less' using errcode = '22023';
  end if;
  select timezone into v_tz from public.businesses where id = p_business_id;
  v_today := (now() at time zone v_tz)::date;
  v_days := p_to - p_from + 1;
  v_unit := case when v_days <= 31 then 'day' when v_days <= 120 then 'week' else 'month' end;

  with pay as (
    select pr.*, pr.amount_cents - pr.refunded_cents as net_cents,
           case when pr.amount_cents > 0
                then round(pr.application_fee_cents::numeric * (pr.amount_cents - pr.refunded_cents) / pr.amount_cents)::int
                else 0 end as net_fee_cents,
           coalesce(pr.job_id, i.job_id) as the_job_id
    from public.payment_records pr
    left join public.invoices i on i.id = pr.invoice_id
    where pr.business_id = p_business_id and pr.received_on between p_from and p_to
  ),
  done as (
    select j.id, j.price_cents, j.customer_id,
           (select count(*) from public.job_assignments a where a.job_id = j.id) as crew
    from public.jobs j
    where j.business_id = p_business_id and j.status = 'completed'
      and (j.completed_at at time zone v_tz)::date between p_from and p_to
  )
  select jsonb_build_object(
    'from', p_from, 'to', p_to, 'today', v_today, 'unit', v_unit,
    'summary', jsonb_build_object(
      'gross_cents',     (select coalesce(sum(amount_cents), 0) from pay),
      'refunded_cents',  (select coalesce(sum(refunded_cents), 0) from pay),
      'net_cents',       (select coalesce(sum(net_cents), 0) from pay),
      'card_cents',      (select coalesce(sum(net_cents), 0) from pay where verification = 'stripe_verified'),
      'recorded_cents',  (select coalesce(sum(net_cents), 0) from pay where verification = 'provider_recorded'),
      'fee_cents',       (select coalesce(sum(net_fee_cents), 0) from pay),
      'payments',        (select count(*) from pay),
      'completed_jobs',  (select count(*) from done),
      'completed_value_cents', (select coalesce(sum(price_cents), 0) from done),
      'average_job_cents', (select coalesce(round(avg(price_cents))::int, 0) from done),
      'new_customers',   (select count(*) from public.crm_customers where business_id = p_business_id
                            and (created_at at time zone v_tz)::date between p_from and p_to),
      'invoiced_cents',  (select coalesce(sum(total_cents), 0) from public.invoices where business_id = p_business_id
                            and status not in ('draft', 'void') and issue_date between p_from and p_to)
    ),
    'series', coalesce((
      select jsonb_agg(jsonb_build_object('period', to_char(p, 'YYYY-MM-DD'), 'cents', coalesce(c, 0)) order by p)
      from generate_series(date_trunc(v_unit, p_from::timestamp), p_to::timestamp, ('1 ' || v_unit)::interval) p
      left join (select date_trunc(v_unit, received_on::timestamp) as k, sum(net_cents) as c from pay group by 1) s on s.k = p
    ), '[]'::jsonb),
    'by_method', coalesce((
      select jsonb_agg(jsonb_build_object('method', method, 'cents', cents, 'count', n) order by cents desc)
      from (select method, sum(net_cents) as cents, count(*) as n from pay group by method) t
    ), '[]'::jsonb),
    'by_service', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'cents', cents) order by cents desc)
      from (select coalesce(sc.name, 'Uncategorized') as name, sum(pay.net_cents) as cents
            from pay left join public.jobs j on j.id = pay.the_job_id
            left join public.service_categories sc on sc.id = j.category_id
            group by 1) t
    ), '[]'::jsonb),
    -- Completed jobs per person. A job done by two people counts for both; its value is split evenly.
    'by_employee', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', user_id, 'name', name, 'jobs', jobs, 'value_cents', value_cents) order by value_cents desc, name)
      from (
        select a.user_id, coalesce(nullif(p.full_name, ''), p.email, 'Former team member') as name,
               count(*) as jobs, round(sum(d.price_cents::numeric / d.crew))::int as value_cents
        from done d
        join public.job_assignments a on a.job_id = d.id
        left join public.profiles p on p.id = a.user_id
        group by a.user_id, p.full_name, p.email
        union all
        select null, 'Unassigned', count(*), coalesce(sum(price_cents), 0)::int from done where crew = 0 having count(*) > 0
      ) t
    ), '[]'::jsonb),
    'top_customers', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'name', full_name, 'cents', cents, 'payments', n) order by cents desc)
      from (select c.id, c.full_name, sum(pay.net_cents) as cents, count(*) as n
            from pay join public.crm_customers c on c.id = pay.customer_id
            group by c.id, c.full_name order by cents desc limit 10) t
    ), '[]'::jsonb),
    -- Unpaid balances today, by how late they are (not tied to the date range).
    'aging', (
      select jsonb_build_object(
        'current_cents', coalesce(sum(bal) filter (where late <= 0), 0),
        'current_count', count(*) filter (where late <= 0),
        'd1_30_cents',   coalesce(sum(bal) filter (where late between 1 and 30), 0),
        'd1_30_count',   count(*) filter (where late between 1 and 30),
        'd31_60_cents',  coalesce(sum(bal) filter (where late between 31 and 60), 0),
        'd31_60_count',  count(*) filter (where late between 31 and 60),
        'd61_cents',     coalesce(sum(bal) filter (where late > 60), 0),
        'd61_count',     count(*) filter (where late > 60))
      from (select total_cents - amount_paid_cents as bal, v_today - coalesce(due_date, issue_date) as late
            from public.invoices where business_id = p_business_id and status in ('sent', 'partially_paid')) t
    ),
    'overdue', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'number', number, 'customer', customer, 'balance_cents', bal, 'days_late', late) order by late desc)
      from (select i.id, i.number, c.full_name as customer, i.total_cents - i.amount_paid_cents as bal,
                   v_today - coalesce(i.due_date, i.issue_date) as late
            from public.invoices i join public.crm_customers c on c.id = i.customer_id
            where i.business_id = p_business_id and i.status in ('sent', 'partially_paid')
              and v_today - coalesce(i.due_date, i.issue_date) > 0
            order by late desc limit 15) t
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.business_report(uuid, date, date) from public, anon;
grant execute on function public.business_report(uuid, date, date) to authenticated;

-- Rows for the CSV download: every payment in the range (owners and managers only).
create function public.business_report_payments(p_business_id uuid, p_from date, p_to date)
returns table (received_on date, customer text, invoice_number int, job_title text, method public.payment_method,
               verification public.payment_verification, amount_cents int, refunded_cents int, fee_cents int, note text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_business_member(p_business_id) or public.is_admin()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
    select pr.received_on, c.full_name, i.number, j.title, pr.method, pr.verification, pr.amount_cents, pr.refunded_cents,
           case when pr.amount_cents > 0 then round(pr.application_fee_cents::numeric * (pr.amount_cents - pr.refunded_cents) / pr.amount_cents)::int else 0 end,
           pr.note
    from public.payment_records pr
    join public.crm_customers c on c.id = pr.customer_id
    left join public.invoices i on i.id = pr.invoice_id
    left join public.jobs j on j.id = coalesce(pr.job_id, i.job_id)
    where pr.business_id = p_business_id and pr.received_on between p_from and p_to
    order by pr.received_on, pr.created_at;
end;
$$;
revoke all on function public.business_report_payments(uuid, date, date) from public, anon;
grant execute on function public.business_report_payments(uuid, date, date) to authenticated;
