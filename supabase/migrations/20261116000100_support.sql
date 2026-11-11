-- Phase 6: support workflow. Anyone signed in can contact support (not only about a booking),
-- sees their own requests and the reply, and is notified when an admin answers.

alter table public.support_reports drop constraint support_reports_category_check;
alter table public.support_reports add constraint support_reports_category_check
  check (category in ('problem_with_job', 'payment', 'safety', 'account', 'privacy', 'question', 'other'));
alter table public.support_reports add column subject text check (char_length(subject) <= 150);
grant insert (subject) on public.support_reports to authenticated;

-- At most 10 requests per person per day (stops floods; real people never get near it).
create or replace function public.support_reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.reporter_id := auth.uid();
  new.status := 'open';
  new.admin_note := null;
  new.resolved_at := null;
  if new.reporter_id is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  if (select count(*) from public.support_reports where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You''ve sent a lot of requests today. We''ll reply to those first; please try again tomorrow.' using errcode = 'P0001';
  end if;
  if new.booking_id is not null and not public.is_booking_participant(new.booking_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if new.request_id is not null and not exists (
    select 1 from public.service_requests where id = new.request_id and customer_id = auth.uid()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.support_reports_before_insert() from public, anon, authenticated;

create or replace function public.admin_resolve_report(p_report_id uuid, p_note text)
returns public.support_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.support_reports;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.support_reports set status = 'resolved', resolved_at = now(), admin_note = left(nullif(trim(p_note), ''), 2000)
  where id = p_report_id returning * into v;
  if v.id is null then raise exception 'Report not found'; end if;
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'support_report.resolve', 'support_report', v.id::text, jsonb_build_object('note', v.admin_note));
  insert into public.notifications (user_id, kind, title, body, link)
  values (v.reporter_id, 'support_reply', 'Support replied to your request',
          coalesce(left(v.admin_note, 300), 'Your support request was resolved.'), '/help');
  return v;
end;
$$;
