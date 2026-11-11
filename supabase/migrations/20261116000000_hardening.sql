-- Phase 6 security hardening.
-- 1. Supabase's default privileges give signed-out (anon) and signed-in (authenticated) users
--    TRUNCATE, REFERENCES and TRIGGER on every new table. The API can't use them, but TRUNCATE
--    ignores row-level security, so remove them now and for future tables (defence in depth).
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke truncate, references, trigger on tables from anon, authenticated;

-- 2. Trigger functions are never called directly; nobody but the database needs EXECUTE on them.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end;
$$;
