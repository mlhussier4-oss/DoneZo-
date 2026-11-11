/**
 * Phase 6: automated security audit of the database itself. These checks run against the real schema,
 * so a future migration that forgets row-level security or opens a function to the public fails the build.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

const db = new Client({ connectionString: process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
beforeAll(() => db.connect());
afterAll(() => db.end());

const rows = async (sql: string) => (await db.query(sql)).rows.map((r) => Object.values(r)[0] as string).sort();

// Things signed-out visitors may legitimately read (public marketplace and pricing info).
const ANON_READABLE = ["plan_features", "plans", "platform_settings", "portfolio_photos", "provider_categories", "reviews", "service_areas", "service_categories", "zip_codes"];
// Functions signed-out visitors may call; each checks its own inputs (invoice/estimate links, public profiles).
const ANON_FUNCTIONS = ["business_public_stats", "get_provider_profile", "get_public_estimate", "get_public_invoice", "is_admin", "zip_in_service_area"];
// Called only by DoneZo's server with the service key (Stripe webhook, invitations).
const SERVICE_ONLY = ["stripe_record_checkout_paid", "stripe_mark_payment_request", "stripe_record_refund", "invoice_for_payment", "accept_invitation_for", "is_unaccepted_invitee"];

describe("database security audit", () => {
  it("every table has row-level security switched on", async () => {
    expect(await rows(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity`)).toEqual([]);
  });

  it("there are no views that could bypass row-level security", async () => {
    expect(await rows(`select viewname from pg_views where schemaname = 'public'`)).toEqual([]);
  });

  it("signed-out visitors can read only public tables, and write none", async () => {
    expect(await rows(`select distinct table_name from information_schema.role_table_grants
      where grantee = 'anon' and table_schema = 'public' and privilege_type = 'SELECT'`)).toEqual(ANON_READABLE);
    expect(await rows(`select distinct table_name from information_schema.role_table_grants
      where grantee = 'anon' and table_schema = 'public' and privilege_type <> 'SELECT'`)).toEqual([]);
    expect(await rows(`select distinct table_name from information_schema.column_privileges
      where grantee = 'anon' and table_schema = 'public' and privilege_type <> 'SELECT'`)).toEqual([]);
  });

  it("no one but the database can TRUNCATE (which skips row-level security)", async () => {
    expect(await rows(`select distinct table_name from information_schema.role_table_grants
      where grantee in ('anon', 'authenticated') and table_schema = 'public' and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')`)).toEqual([]);
  });

  it("every privileged function pins its search path", async () => {
    expect(await rows(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef
        and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`)).toEqual([]);
  });

  it("signed-out visitors can call only the public functions", async () => {
    expect(await rows(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')`)).toEqual(ANON_FUNCTIONS.sort());
  });

  it("payment-confirmation and invitation-acceptance functions are server-only", async () => {
    const open = await rows(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = any (array['${SERVICE_ONLY.join("','")}'])
        and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`);
    expect(open).toEqual([]);
    expect((await rows(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = any (array['${SERVICE_ONLY.join("','")}'])`)).length).toBe(SERVICE_ONLY.length);
  });

  it("trigger functions can't be called directly", async () => {
    expect(await rows(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
        and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`)).toEqual([]);
  });

  it("only the business logo/portfolio bucket is public; private photos have size and type limits", async () => {
    const { rows: buckets } = await db.query(`select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id`);
    expect(buckets.filter((b) => b.public).map((b) => b.id)).toEqual(["business-media"]);
    for (const b of buckets) {
      expect(Number(b.file_size_limit)).toBeGreaterThan(0);
      expect(b.allowed_mime_types.every((m: string) => m.startsWith("image/"))).toBe(true);
    }
  });
});
