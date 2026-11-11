import "server-only";
import type Stripe from "stripe";
import { siteUrl } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { assertTestMode, stripe } from "./server";
import { syncSubscription } from "./sync";

const LOOKUP_KEY = "donezo_standard_monthly";

/** The monthly price in Stripe, created on first use and replaced if the configured amount changes. */
async function subscriptionPrice(): Promise<Stripe.Price> {
  const db = createServiceClient();
  const { data: settings } = await db.from("platform_settings").select("subscription_price_cents").single();
  const amount = settings?.subscription_price_cents ?? 999;
  const existing = await stripe().prices.list({ lookup_keys: [LOOKUP_KEY], active: true, limit: 1 });
  const price = existing.data[0];
  if (price && price.unit_amount === amount && price.recurring?.interval === "month") return price;
  const productId = typeof price?.product === "string" ? price.product : (await stripe().products.create({ name: "DoneZo Standard" })).id;
  return stripe().prices.create({
    product: productId,
    unit_amount: amount,
    currency: "usd",
    recurring: { interval: "month" },
    lookup_key: LOOKUP_KEY,
    transfer_lookup_key: true,
  });
}

async function customerFor(business: { id: string; name: string; email: string | null }): Promise<string> {
  const db = createServiceClient();
  const { data } = await db.from("business_subscriptions").select("stripe_customer_id").eq("business_id", business.id).maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id;
  const customer = await stripe().customers.create(
    { name: business.name, email: business.email ?? undefined, metadata: { business_id: business.id } },
    { idempotencyKey: `donezo-customer-${business.id}` },
  );
  assertTestMode(customer);
  await db.from("business_subscriptions").upsert({ business_id: business.id, stripe_customer_id: customer.id });
  return customer.id;
}

/** Start Stripe's hosted checkout for the monthly subscription. Returns the URL to send the provider to. */
export async function startSubscriptionCheckout(business: { id: string; name: string; email: string | null }): Promise<string> {
  const [price, customer] = await Promise.all([subscriptionPrice(), customerFor(business)]);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: price.id, quantity: 1 }],
    client_reference_id: business.id,
    subscription_data: { metadata: { business_id: business.id } },
    success_url: `${siteUrl("/subscribe").toString()}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: siteUrl("/subscribe?canceled=1").toString(),
  });
  assertTestMode(session);
  if (!session.url) throw new Error("Stripe did not return a checkout link.");
  return session.url;
}

/**
 * After Stripe sends the provider back, read the session from Stripe's API (never trusting the URL
 * alone) and save the subscription. The webhook does the same; whichever comes first wins.
 */
export async function confirmSubscriptionSession(sessionId: string, businessId: string): Promise<boolean> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return false;
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  assertTestMode(session);
  if (session.client_reference_id !== businessId || session.mode !== "subscription" || !session.subscription) return false;
  const sub = typeof session.subscription === "string" ? await stripe().subscriptions.retrieve(session.subscription) : session.subscription;
  await syncSubscription(sub);
  return ["active", "trialing"].includes(sub.status);
}

/** Stripe's billing page: update card, see receipts, cancel. */
export async function billingPortalUrl(businessId: string): Promise<string> {
  const db = createServiceClient();
  const { data } = await db.from("business_subscriptions").select("stripe_customer_id").eq("business_id", businessId).maybeSingle();
  if (!data?.stripe_customer_id) throw new Error("No billing account yet.");
  const create = () => stripe().billingPortal.sessions.create({ customer: data.stripe_customer_id!, return_url: siteUrl("/provider/settings").toString() });
  try {
    return (await create()).url;
  } catch (err) {
    // A new Stripe account has no portal settings yet; create sensible ones once.
    if (!(err instanceof Error) || !/configuration/i.test(err.message)) throw err;
    await stripe().billingPortal.configurations.create({
      features: {
        payment_method_update: { enabled: true },
        invoice_history: { enabled: true },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
      },
    });
    return (await create()).url;
  }
}
