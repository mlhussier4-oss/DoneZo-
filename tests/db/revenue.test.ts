/**
 * Admin revenue box (owner request 2026-11-22): subscription payments saved once per Stripe invoice,
 * refunds subtracted, readable only by admins.
 */
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { adminClient, businessIdFor, createAdmin, createUser } from "./helpers";

type Revenue = { range: string; subs_cents: number; payments: number; fees_cents: number; buckets: { label: string; subs_cents: number }[]; recent: { business: string; amount_cents: number; refunded_cents: number }[] };

describe("admin revenue", () => {
  it("counts each subscription payment once, subtracts refunds, and buckets by period", async () => {
    const admin = await createAdmin();
    const pro = await createUser({ role: "provider", business_name: `Revenue Co ${Date.now()}`, marketplace_enabled: true });
    const businessId = await businessIdFor(pro.id);
    const before = (await admin.client.rpc("admin_revenue", { p_range: "today" })).data as Revenue;

    const invoice = `in_test_${randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    for (let i = 0; i < 2; i++) { // a duplicate webhook
      expect((await adminClient().rpc("record_subscription_payment", { p_invoice_id: invoice, p_business_id: businessId, p_amount_cents: 1999, p_paid_at: now })).error).toBeNull();
    }
    // $0 invoices (free month, paid by credit) aren't income.
    await adminClient().rpc("record_subscription_payment", { p_invoice_id: `${invoice}_zero`, p_business_id: businessId, p_amount_cents: 0, p_paid_at: now });

    const after = (await admin.client.rpc("admin_revenue", { p_range: "today" })).data as Revenue;
    expect(after.subs_cents - before.subs_cents).toBe(1999);
    expect(after.payments - before.payments).toBe(1);
    expect(after.buckets).toHaveLength(24);
    expect(after.recent[0]).toMatchObject({ amount_cents: 1999 });

    for (const range of ["7d", "30d", "year"]) {
      const r = (await admin.client.rpc("admin_revenue", { p_range: range })).data as Revenue;
      expect(r.buckets).toHaveLength(range === "7d" ? 7 : range === "30d" ? 30 : 12);
      expect(r.subs_cents).toBeGreaterThanOrEqual(1999);
    }

    await adminClient().rpc("record_subscription_refund", { p_invoice_id: invoice, p_refunded_total_cents: 1999 });
    const refunded = (await admin.client.rpc("admin_revenue", { p_range: "today" })).data as Revenue;
    expect(refunded.subs_cents).toBe(before.subs_cents);
  });

  it("only admins can see revenue", async () => {
    const pro = await createUser({ role: "provider", business_name: `Nosy Co ${Date.now()}`, marketplace_enabled: true });
    const { data, error } = await pro.client.rpc("admin_revenue", { p_range: "30d" });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect((await pro.client.from("subscription_payments").select("id")).data ?? []).toEqual([]);
    expect((await pro.client.rpc("record_subscription_payment", { p_invoice_id: "in_fake", p_business_id: await businessIdFor(pro.id), p_amount_cents: 999, p_paid_at: new Date().toISOString() })).error).not.toBeNull();
  });
});
