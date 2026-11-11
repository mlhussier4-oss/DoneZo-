/**
 * Phase 5: date-range reports. Figures come from real rows; refunds are subtracted; only owners/managers may run them.
 */
import { describe, expect, it } from "vitest";
import { adminClient, anonClient, businessIdFor, createUser } from "./helpers";

async function setup() {
  const o = await createUser({ role: "provider", business_name: `Report Co ${Date.now()}` });
  const businessId = await businessIdFor(o.id);
  const { data: today } = await o.client.rpc("business_dashboard", { p_business_id: businessId });
  const day = (today as { today: string }).today;
  const { data: c } = await o.client.from("crm_customers").insert({ business_id: businessId, full_name: "Report Customer" }).select().single();
  const { data: j } = await o.client.from("jobs").insert({ business_id: businessId, customer_id: c!.id, title: "Mow", price_cents: 8000, status: "scheduled" }).select().single();

  // An employee, assigned to the job, who completes it.
  const email = `crew-${crypto.randomUUID()}@example.com`;
  const { data: inv } = await o.client.rpc("create_invitation", { p_business_id: businessId, p_email: email, p_full_name: "Casey Crew", p_role: "employee" });
  const password = `Pw-${crypto.randomUUID()}`;
  const { data: eu } = await adminClient().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { invite_token: inv.token, full_name: "Casey Crew" } });
  const employee = anonClient();
  await employee.auth.signInWithPassword({ email, password });
  await o.client.from("job_assignments").insert({ job_id: j!.id, user_id: eu.user!.id, business_id: businessId });
  expect((await employee.from("jobs").update({ status: "completed" }).eq("id", j!.id)).error).toBeNull();

  // $50 cash recorded by the provider; a $100 card payment (fee $10) that was half refunded.
  await o.client.from("payment_records").insert({ business_id: businessId, customer_id: c!.id, job_id: j!.id, amount_cents: 5000, method: "cash", received_on: day });
  const { error } = await adminClient().from("payment_records").insert({
    business_id: businessId, customer_id: c!.id, amount_cents: 10000, method: "card", verification: "stripe_verified",
    stripe_payment_intent_id: `pi_report_${crypto.randomUUID()}`, application_fee_cents: 1000, refunded_cents: 5000, received_on: day,
  });
  if (error) throw error;
  return { o, businessId, day, employee, employeeId: eu.user!.id, customerId: c!.id };
}

describe("business_report", () => {
  it("totals revenue net of refunds, splits by method, person and customer", async () => {
    const { o, businessId, day, employeeId, customerId } = await setup();
    const { data, error } = await o.client.rpc("business_report", { p_business_id: businessId, p_from: day, p_to: day });
    expect(error).toBeNull();
    const r = data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(r.summary).toMatchObject({
      gross_cents: 15000, refunded_cents: 5000, net_cents: 10000, card_cents: 5000, recorded_cents: 5000,
      fee_cents: 500, payments: 2, completed_jobs: 1, completed_value_cents: 8000, new_customers: 1,
    });
    expect(r.unit).toBe("day");
    expect(r.series).toEqual([{ period: day, cents: 10000 }]);
    expect(r.by_method).toEqual(expect.arrayContaining([{ method: "cash", cents: 5000, count: 1 }, { method: "card", cents: 5000, count: 1 }]));
    expect(r.by_employee).toEqual([{ user_id: employeeId, name: "Casey Crew", jobs: 1, value_cents: 8000 }]);
    expect(r.top_customers).toEqual([{ id: customerId, name: "Report Customer", cents: 10000, payments: 2 }]);

    const { data: rows } = await o.client.rpc("business_report_payments", { p_business_id: businessId, p_from: day, p_to: day });
    expect(rows).toHaveLength(2);
    expect(rows!.find((x: { method: string }) => x.method === "card")).toMatchObject({ amount_cents: 10000, refunded_cents: 5000, fee_cents: 500 });

    // The overview counts refunds out too.
    const { data: dash } = await o.client.rpc("business_dashboard", { p_business_id: businessId });
    expect((dash as { revenue_month_cents: number }).revenue_month_cents).toBe(10000);
  });

  it("puts unpaid invoices in aging buckets by days past due", async () => {
    const { o, businessId, day, customerId } = await setup();
    const back = (n: number) => new Date(Date.parse(`${day}T12:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
    for (const [due, price] of [[back(45), 3000], [back(5), 2000], [day, 1000]] as const) {
      const { data: inv } = await o.client.from("invoices").insert({ business_id: businessId, customer_id: customerId, issue_date: back(60), due_date: due }).select().single();
      await o.client.from("invoice_line_items").insert({ business_id: businessId, invoice_id: inv!.id, position: 0, description: "Work", quantity: 1, unit_price_cents: price, taxable: false });
      await o.client.rpc("send_invoice", { p_invoice_id: inv!.id });
    }
    const { data } = await o.client.rpc("business_report", { p_business_id: businessId, p_from: day, p_to: day });
    const r = data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(r.aging).toEqual({ current_cents: 1000, current_count: 1, d1_30_cents: 2000, d1_30_count: 1, d31_60_cents: 3000, d31_60_count: 1, d61_cents: 0, d61_count: 0 });
    expect(r.overdue.map((x: { days_late: number }) => x.days_late)).toEqual([45, 5]);
  });

  it("is refused for employees, other businesses and bad ranges", async () => {
    const { businessId, day, employee } = await setup();
    const stranger = await createUser({ role: "provider", business_name: "Other Co" });
    expect((await employee.rpc("business_report", { p_business_id: businessId, p_from: day, p_to: day })).error).not.toBeNull();
    expect((await employee.rpc("business_report_payments", { p_business_id: businessId, p_from: day, p_to: day })).error).not.toBeNull();
    expect((await stranger.client.rpc("business_report", { p_business_id: businessId, p_from: day, p_to: day })).error).not.toBeNull();
    expect((await stranger.client.rpc("business_report_payments", { p_business_id: businessId, p_from: day, p_to: day })).error).not.toBeNull();
    const { data: own } = await stranger.client.rpc("business_dashboard", { p_business_id: await businessIdFor(stranger.id) });
    expect(own).not.toBeNull();
    expect((await anonClient().rpc("business_report", { p_business_id: businessId, p_from: day, p_to: day })).error).not.toBeNull();
    const o2 = await createUser({ role: "provider", business_name: "Range Co" });
    const b2 = await businessIdFor(o2.id);
    expect((await o2.client.rpc("business_report", { p_business_id: b2, p_from: day, p_to: "2000-01-01" })).error?.message).toMatch(/valid date range/);
  });
});
