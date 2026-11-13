import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { E2E_WEBHOOK_SECRET } from "../../playwright.config";
import { atPath, businessIdForEmail, signUpProvider, uniqueEmail } from "./helpers";

/**
 * Payments, end to end: the site talks to Stripe's local simulator (stripe-mock), and these tests
 * play Stripe's part for webhooks by sending events signed exactly as Stripe signs them.
 * Stripe's hosted pages (checkout, onboarding) are outside HomeHire, so navigations there are stubbed.
 */
const db = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

const signer = new Stripe("sk_test_signing_only");

async function sendWebhook(page: Page, event: Record<string, unknown>, secret = E2E_WEBHOOK_SECRET) {
  const payload = JSON.stringify({ object: "event", api_version: "2026-10-28", livemode: false, created: Math.floor(Date.now() / 1000), ...event });
  const header = signer.webhooks.generateTestHeaderString({ payload, secret });
  return page.request.post("/api/stripe/webhook", { data: payload, headers: { "stripe-signature": header, "content-type": "application/json" } });
}

async function stubStripePages(page: Page) {
  await page.route(/^https:\/\/([a-z0-9-]+\.)*stripe\.(com|me)\//, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Stripe hosted page (stubbed in tests)</h1>" }),
  );
}

test.describe("subscription required for providers", () => {
  test("a new provider must subscribe before using HomeHire; the plan paid for decides Basic or Pro", async ({ page }) => {
    await stubStripePages(page);
    const email = uniqueEmail("subscriber");
    await signUpProvider(page, { usage: "basic", businessName: "Pay First Co", email, subscribe: false });

    // Both plans are offered; the one picked at sign-up is highlighted.
    await expect(page.getByTestId("plan-basic").getByText("Your choice")).toBeVisible();
    await expect(page.getByTestId("plan-pro").getByText("$19.99", { exact: true })).toBeVisible();
    await page.goto("/provider/customers");
    await expect(page).toHaveURL(atPath("/subscribe")); // every provider page is locked

    await page.getByRole("button", { name: "Subscribe: HomeHire Pro, $19.99/month" }).click();
    await expect(page.getByText("Stripe hosted page")).toBeVisible();

    // The Stripe customer was created and saved; no access until Stripe confirms the subscription.
    const businessId = await businessIdForEmail(email);
    const { data: sub } = await db().from("business_subscriptions").select("stripe_customer_id, status").eq("business_id", businessId).single();
    expect(sub?.stripe_customer_id).toMatch(/^cus_/);
    expect(sub?.status).toBeNull();

    const subscriptionId = `sub_e2e_${Date.now()}`;
    const subEvent = (type: string, status: string, lookupKey: string | null) => ({
      id: `evt_${type}_${Date.now()}_${Math.random()}`,
      type,
      data: { object: { id: subscriptionId, object: "subscription", customer: sub!.stripe_customer_id, status, cancel_at_period_end: false, livemode: false,
        metadata: { business_id: businessId },
        items: { object: "list", data: lookupKey ? [{ id: "si_e2e", current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, price: { id: `price_${lookupKey}`, object: "price", lookup_key: lookupKey } }] : [] } } },
    });

    // Paid for Pro (even though Basic was picked at sign-up): business tools unlock.
    expect((await sendWebhook(page, subEvent("customer.subscription.created", "active", "donezo_pro_monthly"))).status()).toBe(200);
    await page.goto("/provider/customers");
    await expect(page).toHaveURL(atPath("/provider/customers"));
    await page.goto("/provider/settings");
    await expect(page.getByText("HomeHire Pro, $19.99/month")).toBeVisible();
    await expect(page.getByText(/Renews/)).toBeVisible();

    // Switched to Basic at the billing date: marketplace menu, business tools show the upgrade page.
    expect((await sendWebhook(page, subEvent("customer.subscription.updated", "active", "donezo_basic_monthly"))).status()).toBe(200);
    await page.goto("/provider");
    await expect(page).toHaveURL(atPath("/provider/marketplace"));
    const nav = page.getByRole("navigation", { name: "Business navigation" }).first();
    await expect(nav.getByRole("link", { name: "Customers" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Plan & billing" })).toBeVisible();
    await page.goto("/provider/customers");
    await expect(page).toHaveURL(/\/provider\/plan\?need=pro/);
    await expect(page.getByText("part of HomeHire Pro", { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Upgrade to Pro, $19.99/month" })).toBeVisible();

    // Canceled subscription → locked again.
    expect((await sendWebhook(page, subEvent("customer.subscription.deleted", "canceled", null))).status()).toBe(200);
    await page.goto("/provider");
    await expect(page).toHaveURL(atPath("/subscribe"));
    await expect(page.getByText("Your subscription has ended")).toBeVisible();
  });
});

test.describe("card payments with HomeHire's 10% fee", () => {
  test("connect Stripe → card link → customer pays → verified webhook → paid → refund", async ({ page, browser }) => {
    test.setTimeout(120_000);
    await stubStripePages(page);
    const email = uniqueEmail("cardpro");
    await signUpProvider(page, { usage: "crm", businessName: "Card Ready Lawn", email });
    const businessId = await businessIdForEmail(email);

    // 1. Before connecting, card payments are off.
    await page.goto("/provider/payments");
    await expect(page.getByText("Not connected")).toBeVisible();
    // "Connect Stripe" creates the account with Stripe Accounts v2, which the local simulator doesn't
    // support; that click is verified against real Stripe test mode instead (see docs/PROGRESS.md).
    // Here the account exists and Stripe is still waiting for the provider's details.
    const acct = { stripe_account_id: `acct_e2e${Date.now()}`, status: "onboarding_incomplete" };
    await db().from("stripe_accounts").insert({ business_id: businessId, ...acct });

    // 2. Stripe reports the account is ready.
    expect((await sendWebhook(page, {
      id: `evt_acct_${Date.now()}`, type: "account.updated", account: acct.stripe_account_id,
      data: { object: { id: acct.stripe_account_id, object: "account", charges_enabled: true, payouts_enabled: true, details_submitted: true, livemode: false, requirements: { currently_due: [], past_due: [], disabled_reason: null } } },
    })).status()).toBe(200);
    await page.goto("/provider/payments");
    await expect(page.getByText("Active", { exact: true })).toBeVisible();

    // 3. An invoice for an existing customer, sent with a card link.
    await page.goto("/provider/customers/new");
    await page.getByLabel("Name", { exact: true }).fill("Card Customer");
    await page.getByRole("button", { name: "Add customer" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Card Customer" })).toBeVisible();
    await page.getByRole("link", { name: "Invoice", exact: true }).filter({ visible: true }).click();
    await page.getByLabel("Line 1 description").fill("Monthly yard service");
    await page.getByLabel("Line 1 price").fill("120");
    await page.getByLabel("Tax (%)").fill("0");
    await page.getByRole("button", { name: "Save invoice" }).click();
    await page.getByRole("button", { name: "Mark as sent" }).click();
    await expect(page.getByText("Not requested")).toBeVisible();
    await page.getByRole("button", { name: "Create card payment link" }).click();
    await expect(page.getByText(/Payment link sent/)).toBeVisible();
    const invoiceId = new URL(page.url()).pathname.split("/").pop()!;
    const { data: request } = await db().from("payment_requests").select("checkout_session_id, amount_cents, application_fee_cents, stripe_account_id").eq("invoice_id", invoiceId).single();
    expect(request).toMatchObject({ amount_cents: 12000, application_fee_cents: 1200, stripe_account_id: acct.stripe_account_id });

    // 4. The customer opens the invoice link and taps Pay by card (no sign-in).
    const link = await page.getByLabel("Customer link").inputValue();
    const anon = await browser.newContext();
    const customer = await anon.newPage();
    await stubStripePages(customer);
    await customer.goto(link);
    await customer.getByRole("button", { name: "Pay $120.00 by card" }).click();
    await expect(customer.getByText("Stripe hosted page")).toBeVisible();
    // Returning to the success page does NOT mark it paid.
    await customer.goto(`${link}?payment=submitted`);
    await expect(customer.getByText("We're confirming your payment with Stripe")).toBeVisible();
    await expect(customer.getByText("$120.00 due")).toBeVisible();

    // 5. Bad signature → rejected; nothing recorded.
    const forged = await sendWebhook(page, { id: "evt_forged", type: "checkout.session.completed", data: { object: {} } }, "whsec_wrong");
    expect(forged.status()).toBe(400);

    // 6. Stripe confirms payment (sent twice, as Stripe may do).
    const paid = {
      id: `evt_paid_${Date.now()}`, type: "checkout.session.completed", account: acct.stripe_account_id,
      data: { object: { id: request!.checkout_session_id, object: "checkout.session", mode: "payment", payment_status: "paid", payment_intent: `pi_e2e_${Date.now()}`, amount_total: 12000, livemode: false } },
    };
    expect((await sendWebhook(page, paid)).status()).toBe(200);
    const again = await sendWebhook(page, paid);
    expect(await again.json()).toMatchObject({ duplicate: true });

    await page.reload();
    await expect(page.getByText("Verified by Stripe")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 }).getByText("Paid").or(page.getByText("Paid", { exact: true }).first())).toBeVisible();
    await customer.reload();
    await expect(customer.getByText("Paid", { exact: true }).first()).toBeVisible();
    await expect(customer.getByRole("button", { name: /by card/ })).toHaveCount(0);
    await anon.close();

    await page.goto("/provider/payments");
    await expect(page.getByRole("cell", { name: "$12.00" })).toBeVisible(); // HomeHire's 10% fee

    // 7. Refund (HomeHire's fee refunded too), confirmed by Stripe's webhook.
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Refund" }).click();
    await expect(page.getByText("Refund requested")).toBeVisible();
    await sendWebhook(page, {
      id: `evt_refund_${Date.now()}`, type: "charge.refunded", account: acct.stripe_account_id,
      data: { object: { id: "ch_e2e", object: "charge", payment_intent: (paid.data.object as { payment_intent: string }).payment_intent, amount: 12000, amount_refunded: 12000, livemode: false } },
    });
    await page.goto(`/provider/invoices/${invoiceId}`);
    await expect(page.getByText("Refunded").first()).toBeVisible();
  });

  test("a provider without Stripe connected sees card payments are off and can still record cash", async ({ page }) => {
    await signUpProvider(page, { usage: "crm", businessName: "Cash Only Co", email: uniqueEmail("cashonly") });
    await page.goto("/provider/customers/new");
    await page.getByLabel("Name", { exact: true }).fill("Cash Customer");
    await page.getByRole("button", { name: "Add customer" }).click();
    await page.getByRole("link", { name: "Invoice", exact: true }).filter({ visible: true }).click();
    await page.getByLabel("Line 1 description").fill("Cleanup");
    await page.getByLabel("Line 1 price").fill("50");
    await page.getByRole("button", { name: "Save invoice" }).click();
    await page.getByRole("button", { name: "Mark as sent" }).click();
    await expect(page.getByText("Card payments off")).toBeVisible();
    const link = await page.getByLabel("Customer link").inputValue();
    await page.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText("Recorded by you")).toBeVisible();
    await page.goto(link);
    await expect(page.getByRole("button", { name: /by card/ })).toHaveCount(0);
  });
});

test.describe("marketplace completion payment (Blueprint §18)", () => {
  test("Mark job completed → Card → link in chat → verified payment completes the job", async ({ page }) => {
    test.setTimeout(120_000);
    await stubStripePages(page);
    const email = uniqueEmail("mktpay");
    await signUpProvider(page, { usage: "marketplace", businessName: "Finish Line Lawn", email });
    const businessId = await businessIdForEmail(email);
    const admin = db();

    // Stripe already connected and active for this provider.
    const acctId = `acct_e2e${Date.now()}`;
    await admin.from("stripe_accounts").insert({ business_id: businessId, stripe_account_id: acctId, status: "active", charges_enabled: true, details_submitted: true });
    const { data: cat } = await admin.from("service_categories").select("id").eq("slug", "lawn-mowing").single();
    await admin.from("businesses").update({ home_zip: "78704", service_radius_miles: 20 }).eq("id", businessId);
    await admin.from("provider_categories").insert({ business_id: businessId, category_id: cat!.id });

    // A customer posts, the provider bids, the customer accepts (through their own signed-in clients).
    const custEmail = uniqueEmail("mktcust");
    const { data: cu } = await admin.auth.admin.createUser({ email: custEmail, password: "Customer-pw-123", email_confirm: true, user_metadata: { role: "customer", full_name: "Sam Payer" } });
    const customer = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    await customer.auth.signInWithPassword({ email: custEmail, password: "Customer-pw-123" });
    const { data: req } = await customer.from("service_requests").insert({ category_id: cat!.id, description: "Mow please", timing: "asap", zip: "78745" }).select().single();
    await customer.from("service_request_locations").insert({ request_id: req!.id, line1: "9 Oak Ln", city: "Austin", state: "TX" });
    const { data: bid } = await admin.from("bids").insert({ request_id: req!.id, business_id: businessId, price_cents: 8000, included: "Mow", availability: "Today" }).select().single();
    const { data: pending } = await customer.rpc("accept_bid", { p_bid_id: bid!.id });
    expect(cu?.user?.id).toBeTruthy();

    // The provider confirms within the 5 minutes (owner decision 2026-11-12)…
    await page.goto(`/provider/marketplace/bookings/${pending.id}`);
    await page.getByTestId("confirm-panel").getByRole("button", { name: "Confirm job" }).click();
    await expect(page.getByTestId("confirm-panel")).toHaveCount(0);
    const { data: booking } = await admin.from("bookings").select("id, job_id").eq("id", pending.id).single();

    // …then finishes the job and sends the payment request.
    await page.goto(`/provider/marketplace/bookings/${booking!.id}`);
    const finish = page.getByTestId("finish-job");
    await finish.getByRole("button", { name: "Mark job completed" }).click();
    await finish.getByRole("radio", { name: /^Card/ }).click();
    await finish.getByRole("button", { name: "Send invoice & card link" }).click();
    // The page refreshes into its "waiting for payment" state once the request is sent.
    await expect(page.getByText("Waiting for the customer's card payment").filter({ visible: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(/The job is done! Here's your invoice for \$80\.00/)).toBeVisible();
    await expect(page.getByText("Waiting for the customer's card payment")).toBeVisible();

    const { data: job } = await admin.from("jobs").select("status").eq("id", booking!.job_id!).single();
    expect(job?.status).toBe("awaiting_payment");
    const { data: inv } = await admin.from("invoices").select("id, status, total_cents, source").eq("job_id", booking!.job_id!).single();
    expect(inv).toMatchObject({ status: "sent", total_cents: 8000, source: "marketplace" });
    const { data: pr } = await admin.from("payment_requests").select("checkout_session_id, application_fee_cents").eq("invoice_id", inv!.id).single();
    expect(pr?.application_fee_cents).toBe(800);

    // Stripe confirms the card payment.
    const res = await sendWebhook(page, {
      id: `evt_mkt_${Date.now()}`, type: "checkout.session.completed", account: acctId,
      data: { object: { id: pr!.checkout_session_id, object: "checkout.session", mode: "payment", payment_status: "paid", payment_intent: `pi_mkt_${Date.now()}`, amount_total: 8000, livemode: false } },
    });
    expect(res.status()).toBe(200);
    expect((await admin.from("jobs").select("status").eq("id", booking!.job_id!).single()).data?.status).toBe("completed");
    expect((await admin.from("bookings").select("status").eq("id", booking!.id).single()).data?.status).toBe("completed");
    const { data: notes } = await customer.from("notifications").select("kind").in("kind", ["payment_confirmed", "job_completed"]);
    expect(notes?.map((n) => n.kind).sort()).toEqual(["job_completed", "payment_confirmed"]);
  });
});
