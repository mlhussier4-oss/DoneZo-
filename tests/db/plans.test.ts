/**
 * Owner decision 2026-11-11: HomeHire Basic ($9.99, marketplace only) and HomeHire Pro ($19.99, marketplace + business tools).
 * Every check runs as the real signed-in provider; the database enforces the plan.
 */
import { describe, expect, it } from "vitest";
import { adminClient, anonClient, businessIdFor, createUser, type TestUser } from "./helpers";

type Provider = TestUser & { businessId: string };

async function basic(): Promise<Provider> {
  // A sign-up that chose Basic and paid for it (the Stripe sync sets the plan from the paid price).
  const u = await createUser({ role: "provider", business_name: `Basic Co ${Date.now()}`, plan: "basic", marketplace_enabled: false });
  const businessId = await businessIdFor(u.id);
  expect((await adminClient().rpc("set_business_plan_by_lookup_key", { p_business_id: businessId, p_lookup_key: "donezo_basic_monthly" })).error).toBeNull();
  return { ...u, businessId };
}

const lawnCategory = async () => (await anonClient().from("service_categories").select("id").eq("slug", "lawn-mowing").single()).data!.id as string;

/** A real marketplace booking: customer posts, Basic provider bids, customer accepts. */
async function wonJob(p: Provider) {
  await p.client.from("businesses").update({ home_zip: "78704", service_radius_miles: 25 }).eq("id", p.businessId);
  const cat = await lawnCategory();
  expect((await p.client.from("provider_categories").insert({ business_id: p.businessId, category_id: cat })).error).toBeNull();
  const customer = await createUser({ role: "customer" });
  const { data: req } = await customer.client.from("service_requests").insert({ category_id: cat, description: "Mow the front and back yard please", timing: "this_week", zip: "78745" }).select().single();
  await customer.client.from("service_request_locations").insert({ request_id: req!.id, line1: "1 Market St", city: "Austin", state: "TX", phone: "512-555-0101" });
  const { data: bid, error: bidError } = await p.client.from("bids").insert({ request_id: req!.id, business_id: p.businessId, price_cents: 7000, included: "Mow and edge", availability: "Friday" }).select().single();
  expect(bidError).toBeNull();
  const { data: pending, error } = await customer.client.rpc("accept_bid", { p_bid_id: bid!.id });
  expect(error).toBeNull();
  expect((await p.client.rpc("confirm_booking", { p_booking_id: pending!.id, p_arrival_at: new Date(Date.now() + 86_400_000).toISOString() })).error).toBeNull();
  const { data: job } = await p.client.from("jobs").select("id, customer_id, source").eq("business_id", p.businessId).single();
  expect(job!.source).toBe("marketplace");
  return job!;
}

describe("HomeHire Basic (marketplace only)", () => {
  it("signing up for Basic puts the business on Basic with the marketplace on, and it can't be switched off", async () => {
    const p = await basic();
    const { data: b } = await p.client.from("businesses").select("marketplace_enabled, plans(code)").eq("id", p.businessId).single();
    expect(b).toMatchObject({ marketplace_enabled: true, plans: { code: "basic" } });
    expect((await p.client.rpc("business_has_crm", { p_business_id: p.businessId })).data).toBe(false);
    expect((await p.client.rpc("set_marketplace_enabled", { p_business_id: p.businessId, p_enabled: false })).error?.message).toMatch(/Basic is the marketplace plan/);
  });

  it("can win and complete a marketplace job, invoice it, take a card or cash payment for it", async () => {
    const p = await basic();
    const job = await wonJob(p);
    expect((await p.client.from("jobs").update({ status: "in_progress", notes: "Gate code 1234" }).eq("id", job.id)).error).toBeNull();
    const { data: inv, error } = await p.client.rpc("create_invoice_for_job", { p_job_id: job.id });
    expect(error).toBeNull();
    const invoiceId = inv!.id as string;
    expect((await p.client.rpc("send_invoice", { p_invoice_id: invoiceId })).error).toBeNull();
    expect((await p.client.from("payment_records").insert({ business_id: p.businessId, customer_id: job.customer_id, invoice_id: invoiceId, amount_cents: 7000, method: "cash" })).error).toBeNull();
    expect((await p.client.from("invoices").select("status").eq("id", invoiceId).single()).data?.status).toBe("paid");
  });

  it("can't use business tools: own customers, own jobs, recurring, estimates, recorded payments, team, reports", async () => {
    const p = await basic();
    const job = await wonJob(p);
    const pro = "part of HomeHire Pro";
    expect((await p.client.from("crm_customers").insert({ business_id: p.businessId, full_name: "Outside customer" })).error?.message).toMatch(pro);
    expect((await p.client.from("crm_customer_notes").insert({ business_id: p.businessId, customer_id: job.customer_id, body: "note" })).error?.message).toMatch(pro);
    expect((await p.client.from("jobs").insert({ business_id: p.businessId, customer_id: job.customer_id, title: "Side job", price_cents: 1000 })).error?.message).toMatch(pro);
    expect((await p.client.from("recurring_schedules").insert({ business_id: p.businessId, customer_id: job.customer_id, title: "Weekly", price_cents: 1000, frequency: "weekly", start_date: "2026-12-01", start_time: "09:00" })).error?.message).toMatch(pro);
    expect((await p.client.from("estimates").insert({ business_id: p.businessId, customer_id: job.customer_id })).error?.message).toMatch(pro);
    expect((await p.client.from("invoices").insert({ business_id: p.businessId, customer_id: job.customer_id })).error?.message).toMatch(pro); // an invoice not for a marketplace job
    expect((await p.client.rpc("create_invitation", { p_business_id: p.businessId, p_email: `crew-${Date.now()}@example.com`, p_full_name: "", p_role: "employee" })).error?.message).toMatch(/Team members are part of HomeHire Pro/);
    expect((await p.client.rpc("business_report", { p_business_id: p.businessId, p_from: "2026-01-01", p_to: "2026-12-31" })).error?.message).toMatch(/Reports are part of HomeHire Pro/);
    expect((await p.client.rpc("business_report_payments", { p_business_id: p.businessId, p_from: "2026-01-01", p_to: "2026-12-31" })).error?.message).toMatch(/Reports are part of HomeHire Pro/);
  });
});

describe("switching plans", () => {
  it("upgrading to Pro unlocks business tools; downgrading keeps the records but locks changes", async () => {
    const p = await basic();
    const admin = adminClient();
    await admin.rpc("set_business_plan_by_lookup_key", { p_business_id: p.businessId, p_lookup_key: "donezo_pro_monthly" });
    const { data: c, error } = await p.client.from("crm_customers").insert({ business_id: p.businessId, full_name: "Outside customer" }).select().single();
    expect(error).toBeNull();
    expect((await p.client.rpc("business_has_crm", { p_business_id: p.businessId })).data).toBe(true);

    await admin.rpc("set_business_plan_by_lookup_key", { p_business_id: p.businessId, p_lookup_key: "donezo_basic_monthly" });
    expect((await admin.from("crm_customers").select("id").eq("id", c!.id)).data).toHaveLength(1); // kept
    expect((await p.client.from("crm_customers").update({ full_name: "Changed" }).eq("id", c!.id)).error?.message).toMatch(/part of HomeHire Pro/);
  });

  it("only HomeHire's server can change a plan; sign-up choices and direct edits can't buy Pro for free", async () => {
    const p = await basic();
    expect((await p.client.rpc("set_business_plan_by_lookup_key", { p_business_id: p.businessId, p_lookup_key: "donezo_pro_monthly" })).error).not.toBeNull();
    const { data: pro } = await p.client.from("plans").select("id").eq("code", "pro").single();
    await p.client.from("businesses").update({ plan_id: pro!.id } as never).eq("id", p.businessId);
    expect((await adminClient().from("businesses").select("plans(code)").eq("id", p.businessId).single()).data).toEqual({ plans: { code: "basic" } });
  });

  it("both plans are listed publicly with their prices", async () => {
    const { data } = await anonClient().from("plans").select("code, name, price_cents").eq("is_active", true).order("sort_order");
    expect(data).toEqual([
      { code: "basic", name: "HomeHire Basic", price_cents: 999 },
      { code: "pro", name: "HomeHire Pro", price_cents: 1999 },
    ]);
  });
});
