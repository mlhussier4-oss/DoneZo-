/**
 * Phase 4: paid access and Stripe payment records, against the local database.
 * Stripe itself is not called here; the webhook-only functions are called with the service role,
 * exactly as the verified webhook handler does.
 */
import { describe, expect, it } from "vitest";
import { activateSubscription, adminClient, anonClient, businessIdFor, createAdmin, createUser, type TestUser } from "./helpers";

type Provider = TestUser & { businessId: string };

async function provider(subscribed = true): Promise<Provider> {
  const user = await createUser({ role: "provider", business_name: `Pay Co ${Date.now()}`, marketplace_enabled: true }, { subscribed });
  return { ...user, businessId: await businessIdFor(user.id) };
}

async function sentInvoice(p: Provider, cents = 10000) {
  const { data: c } = await p.client.from("crm_customers").insert({ business_id: p.businessId, full_name: "Card Customer" }).select().single();
  const { data: job } = await p.client.from("jobs").insert({ business_id: p.businessId, customer_id: c!.id, title: "Mow", price_cents: cents, status: "awaiting_payment" }).select().single();
  const { data: inv } = await p.client.rpc("create_invoice_for_job", { p_job_id: job!.id });
  await p.client.rpc("send_invoice", { p_invoice_id: inv.id });
  return { customerId: c!.id, jobId: job!.id, invoiceId: inv.id as string };
}

/** What the server does after creating a Stripe Checkout Session (service role). */
async function paymentRequest(p: Provider, invoiceId: string, amount: number) {
  const session = `cs_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const { error } = await adminClient().from("payment_requests").insert({
    business_id: p.businessId, invoice_id: invoiceId, stripe_account_id: "acct_test123", checkout_session_id: session,
    checkout_url: "https://checkout.stripe.com/c/pay/test", amount_cents: amount, application_fee_cents: Math.round(amount * 0.1),
  });
  if (error) throw error;
  return session;
}

describe("paid access", () => {
  it("a provider without a subscription can sign in and see their business but can't add or change anything", async () => {
    const p = await provider(false);
    expect((await p.client.from("businesses").select("id").eq("id", p.businessId)).data).toHaveLength(1);
    const { error } = await p.client.from("crm_customers").insert({ business_id: p.businessId, full_name: "Blocked" });
    expect(error?.message).toMatch(/subscription isn't active/);

    await activateSubscription(p.businessId);
    expect((await p.client.from("crm_customers").insert({ business_id: p.businessId, full_name: "Allowed" })).error).toBeNull();
  });

  it("past-due (card being retried) keeps access; canceled and unpaid don't", async () => {
    const p = await provider();
    for (const [status, allowed] of [["past_due", true], ["canceled", false], ["unpaid", false], ["active", true]] as const) {
      await activateSubscription(p.businessId, status);
      const { error } = await p.client.from("crm_customers").insert({ business_id: p.businessId, full_name: status });
      expect(error === null, status).toBe(allowed);
    }
  });

  it("an unsubscribed marketplace provider sees no jobs, can't bid, and can't be hired", async () => {
    const paid = await provider();
    const unpaid = await provider(false);
    const { data: cat } = await anonClient().from("service_categories").select("id").eq("slug", "lawn-mowing").single();
    for (const p of [paid, unpaid]) {
      await adminClient().from("businesses").update({ home_zip: "78704", service_radius_miles: 20 }).eq("id", p.businessId);
      await adminClient().from("provider_categories").insert({ business_id: p.businessId, category_id: cat!.id });
    }
    const customer = await createUser({ role: "customer" });
    const { data: r } = await customer.client.from("service_requests")
      .insert({ category_id: cat!.id, description: "Mow", timing: "asap", zip: "78745" }).select().single();

    const ids = async (p: Provider) => ((await p.client.rpc("marketplace_feed")).data ?? []).map((x: { id: string }) => x.id);
    expect(await ids(paid)).toContain(r!.id);
    expect(await ids(unpaid)).not.toContain(r!.id);
    expect((await unpaid.client.from("bids").insert({ request_id: r!.id, business_id: unpaid.businessId, price_cents: 5000, included: "x", availability: "y" })).error).not.toBeNull();

    // A provider who bid, then let the subscription lapse, can't be hired.
    const { data: bid } = await paid.client.from("bids").insert({ request_id: r!.id, business_id: paid.businessId, price_cents: 5000, included: "x", availability: "y" }).select().single();
    await activateSubscription(paid.businessId, "canceled");
    const { error } = await customer.client.rpc("accept_bid", { p_bid_id: bid!.id });
    expect(error?.message).toMatch(/isn't taking marketplace jobs/);
  });

  it("providers can't grant themselves a subscription or a connected Stripe account", async () => {
    const p = await provider(false);
    expect((await p.client.from("business_subscriptions").insert({ business_id: p.businessId, status: "active" })).error).not.toBeNull();
    expect((await p.client.from("stripe_accounts").insert({ business_id: p.businessId, stripe_account_id: "acct_fake", status: "active" })).error).not.toBeNull();
    expect((await p.client.from("business_subscriptions").select("status").eq("business_id", p.businessId)).data).toEqual([]);
  });
});

describe("Stripe-verified payments", () => {
  it("a paid Checkout Session records a verified card payment with DoneZo's 10% fee, once", async () => {
    const p = await provider();
    const { invoiceId, jobId } = await sentInvoice(p, 10000);
    const session = await paymentRequest(p, invoiceId, 10000);

    const pi = `pi_test_${Date.now()}`;
    const first = await adminClient().rpc("stripe_record_checkout_paid", { p_checkout_session_id: session, p_payment_intent_id: pi, p_charge_id: "ch_test_1", p_amount_cents: 10000 });
    expect(first.error).toBeNull();
    // Duplicate webhook: same payment intent, no second record.
    const second = await adminClient().rpc("stripe_record_checkout_paid", { p_checkout_session_id: session, p_payment_intent_id: pi, p_charge_id: "ch_test_1", p_amount_cents: 10000 });
    expect(second.data).toBe(first.data);

    const { data: records } = await p.client.from("payment_records").select("method, verification, amount_cents, application_fee_cents").eq("invoice_id", invoiceId);
    expect(records).toEqual([{ method: "card", verification: "stripe_verified", amount_cents: 10000, application_fee_cents: 1000 }]);
    expect((await p.client.from("invoices").select("status").eq("id", invoiceId).single()).data?.status).toBe("paid");
    expect((await p.client.from("payment_requests").select("status").eq("checkout_session_id", session).single()).data?.status).toBe("paid");
    // "Mark Complete & Send Payment" left the job awaiting payment; the verified payment completes it.
    expect((await p.client.from("jobs").select("status").eq("id", jobId).single()).data?.status).toBe("completed");
  });

  it("a failed or expired link never shows as paid", async () => {
    const p = await provider();
    const { invoiceId } = await sentInvoice(p, 5000);
    const session = await paymentRequest(p, invoiceId, 5000);
    await adminClient().rpc("stripe_mark_payment_request", { p_checkout_session_id: session, p_status: "failed", p_message: "Your card was declined." });
    expect((await p.client.from("payment_requests").select("status, failure_message").eq("checkout_session_id", session).single()).data)
      .toEqual({ status: "failed", failure_message: "Your card was declined." });
    expect((await p.client.from("invoices").select("status, amount_paid_cents").eq("id", invoiceId).single()).data)
      .toEqual({ status: "sent", amount_paid_cents: 0 });
  });

  it("refunds reduce the amount paid; a full refund marks the invoice refunded", async () => {
    const p = await provider();
    const { invoiceId } = await sentInvoice(p, 8000);
    const session = await paymentRequest(p, invoiceId, 8000);
    const pi = `pi_test_${Date.now()}`;
    await adminClient().rpc("stripe_record_checkout_paid", { p_checkout_session_id: session, p_payment_intent_id: pi, p_charge_id: "ch_x", p_amount_cents: 8000 });

    await adminClient().rpc("stripe_record_refund", { p_payment_intent_id: pi, p_refunded_total_cents: 3000 });
    expect((await p.client.from("invoices").select("status, amount_paid_cents").eq("id", invoiceId).single()).data)
      .toEqual({ status: "partially_paid", amount_paid_cents: 5000 });
    await adminClient().rpc("stripe_record_refund", { p_payment_intent_id: pi, p_refunded_total_cents: 8000 });
    expect((await p.client.from("invoices").select("status, amount_paid_cents").eq("id", invoiceId).single()).data)
      .toEqual({ status: "refunded", amount_paid_cents: 0 });
  });

  it("providers can't fake or edit Stripe-verified payments", async () => {
    const p = await provider();
    const { invoiceId, customerId } = await sentInvoice(p, 5000);
    const forged = await p.client.from("payment_records").insert({
      business_id: p.businessId, customer_id: customerId, invoice_id: invoiceId, amount_cents: 5000, method: "cash",
      verification: "stripe_verified", stripe_payment_intent_id: "pi_fake",
    } as never);
    expect(forged.error).not.toBeNull(); // the columns aren't writable by providers at all

    const session = await paymentRequest(p, invoiceId, 5000);
    await adminClient().rpc("stripe_record_checkout_paid", { p_checkout_session_id: session, p_payment_intent_id: `pi_${Date.now()}`, p_charge_id: "ch", p_amount_cents: 5000 });
    const { data: rec } = await p.client.from("payment_records").select("id").eq("invoice_id", invoiceId).single();
    expect((await p.client.from("payment_records").update({ amount_cents: 1 } as never).eq("id", rec!.id)).error).not.toBeNull();
    await p.client.from("payment_records").delete().eq("id", rec!.id);
    expect((await p.client.from("payment_records").select("id").eq("id", rec!.id)).data).toHaveLength(1);
  });

  it("only the server can call the webhook functions", async () => {
    const p = await provider();
    expect((await p.client.rpc("stripe_record_checkout_paid", { p_checkout_session_id: "cs_x", p_payment_intent_id: "pi_x", p_charge_id: "ch_x", p_amount_cents: 1 })).error).not.toBeNull();
    expect((await p.client.rpc("stripe_record_refund", { p_payment_intent_id: "pi_x", p_refunded_total_cents: 1 })).error).not.toBeNull();
    expect((await anonClient().rpc("invoice_for_payment", { p_token: "0".repeat(48) })).error).not.toBeNull();
    const events = await p.client.from("stripe_events").select("id");
    expect(events.data ?? []).toEqual([]); // refused outright (no access at all)
  });

  it("each Stripe event id can be stored only once", async () => {
    const id = `evt_test_${Date.now()}`;
    expect((await adminClient().from("stripe_events").insert({ id, type: "checkout.session.completed", livemode: false })).error).toBeNull();
    expect((await adminClient().from("stripe_events").insert({ id, type: "checkout.session.completed", livemode: false })).error?.code).toBe("23505");
  });
});

describe("platform fee setting", () => {
  it("is 10% by default, readable by everyone and changeable only by admins (logged)", async () => {
    expect((await anonClient().from("platform_settings").select("card_fee_bps").single()).data?.card_fee_bps).toBe(1000);
    const p = await provider();
    expect((await p.client.rpc("admin_set_card_fee", { p_bps: 0 })).error).not.toBeNull();
    const admin = await createAdmin();
    expect((await admin.client.rpc("admin_set_card_fee", { p_bps: 1000 })).error).toBeNull();
    const { data: log } = await admin.client.from("admin_audit_log").select("action").eq("action", "platform.card_fee");
    expect(log!.length).toBeGreaterThan(0);
  });
});
