-- Owner decision 2026-11-13: the brand is now HomeHire (homehire.us). Rename every customer-facing mention
-- in database functions (messages, notifications, errors) and stored display text. Internal identifiers such
-- as Stripe lookup keys (donezo_basic_monthly) and the donezo.system_write setting are unchanged on purpose.
do $$
declare
  r record;
  d text;
begin
  for r in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosrc like '%DoneZo%'
  loop
    d := replace(pg_get_functiondef(r.oid), 'DoneZo', 'HomeHire');
    execute d;
  end loop;
end;
$$;

update public.plans set name = replace(name, 'DoneZo', 'HomeHire'), description = replace(description, 'DoneZo', 'HomeHire')
where name like '%DoneZo%' or description like '%DoneZo%';
update public.notifications set title = replace(title, 'DoneZo', 'HomeHire'), body = replace(body, 'DoneZo', 'HomeHire')
where title like '%DoneZo%' or body like '%DoneZo%';
update public.crm_customers set full_name = 'HomeHire customer' where full_name = 'DoneZo customer';
