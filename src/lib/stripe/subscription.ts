import "server-only";
import type Stripe from "stripe";
import { siteUrl } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { assertTestMode, stripe } from "./server";
import { syncSubscription } from "./sync";

export type PlanCode = "basic" | "pro";
export const planCodes: PlanCode[] = ["basic", "pro"];

/** The plan's monthly price in Stripe (found by its lookup key), created on first use and replaced if the amount changes. */
async function planPrice(code: PlanCode): Promise<Stripe.Price> {
  const db = createServiceClient();
  const { data: plan } = await db.from("plans").select("name, price_cents, stripe_lookup_key").eq("code", code).single();
  if (!plan?.price_cents || !plan.stripe_lookup_key) throw new Error(`Plan ${code} has no price.`);
  const existing = await stripe().prices.list({ lookup_keys: [plan.stripe_lookup_key], active: true, limit: 1 });
  const price = existing.data[0];
  if (price && price.unit_amount === plan.price_cents && price.recurring?.interval === "month") return price;
  const productId = typeof price?.product === "string" ? price.product : (await stripe().products.create({ name: plan.name, metadata: { donezo_plan: code } })).id;
  return stripe().prices.create({
    product: productId,
    unit_amount: plan.price_cents,
    currency: "usd",
    recurring: { interval: "month" },
    lookup_key: plan.stripe_lookup_key,
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

/** Start Stripe's hosted checkout for a plan's monthly subscription. Returns the URL to send the provider to. */
export async function startSubscriptionCheckout(business: { id: string; name: string; email: string | null }, plan: PlanCode): Promise<string> {
  const [price, customer] = await Promise.all([planPrice(plan), customerFor(business)]);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: price.id, quantity: 1 }],
    client_reference_id: business.id,
    subscription_data: { metadata: { business_id: business.id, plan } },
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

/**
 * Stripe's billing page settings for HomeHire (created once, reused): update card, receipts, cancel at the end
 * of the period, and switch between Basic and Pro. Owner decision: upgrades start now and Stripe charges the
 * prorated difference; downgrades take effect at the next billing date.
 */
async function portalConfiguration(): Promise<string> {
  const [basicPrice, proPrice] = await Promise.all([planPrice("basic"), planPrice("pro")]);
  const tag = `plans-${basicPrice.id}-${proPrice.id}`;
  const list = await stripe().billingPortal.configurations.list({ active: true, limit: 100 });
  const found = list.data.find((c) => c.metadata?.donezo === tag);
  if (found) return found.id;
  const productOf = (p: Stripe.Price) => (typeof p.product === "string" ? p.product : p.product.id);
  const created = await stripe().billingPortal.configurations.create({
    metadata: { donezo: tag },
    business_profile: { headline: "HomeHire subscription" },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        proration_behavior: "always_invoice",
        products: [
          { product: productOf(basicPrice), prices: [basicPrice.id] },
          { product: productOf(proPrice), prices: [proPrice.id] },
        ],
        schedule_at_period_end: { conditions: [{ type: "decreasing_item_amount" }] },
      },
    },
  });
  return created.id;
}

async function savedSubscription(businessId: string) {
  const db = createServiceClient();
  const { data } = await db.from("business_subscriptions").select("stripe_customer_id, stripe_subscription_id").eq("business_id", businessId).maybeSingle();
  return data;
}

/** Stripe's billing page: update card, see receipts, switch plan, cancel. */
export async function billingPortalUrl(businessId: string): Promise<string> {
  const saved = await savedSubscription(businessId);
  if (!saved?.stripe_customer_id) throw new Error("No billing account yet.");
  const session = await stripe().billingPortal.sessions.create({
    customer: saved.stripe_customer_id,
    configuration: await portalConfiguration(),
    return_url: siteUrl("/provider/plan").toString(),
  });
  return session.url;
}

/** Stripe's confirmation page for switching an active subscription to another plan (shows the amount due now). */
export async function changePlanUrl(businessId: string, plan: PlanCode): Promise<string> {
  const saved = await savedSubscription(businessId);
  if (!saved?.stripe_customer_id || !saved.stripe_subscription_id) throw new Error("No active subscription.");
  const [sub, price, configuration] = await Promise.all([
    stripe().subscriptions.retrieve(saved.stripe_subscription_id),
    planPrice(plan),
    portalConfiguration(),
  ]);
  assertTestMode(sub);
  const item = sub.items.data[0];
  if (!item) throw new Error("Subscription has no items.");
  const session = await stripe().billingPortal.sessions.create({
    customer: saved.stripe_customer_id,
    configuration,
    return_url: siteUrl("/provider/plan").toString(),
    flow_data: {
      type: "subscription_update_confirm",
      subscription_update_confirm: { subscription: sub.id, items: [{ id: item.id, price: price.id, quantity: 1 }] },
      after_completion: { type: "redirect", redirect: { return_url: siteUrl("/provider/plan?changed=1").toString() } },
    },
  });
  return session.url;
}

/** After a plan change, read the subscription straight from Stripe so the new plan shows immediately. */
export async function refreshSubscription(businessId: string): Promise<void> {
  const saved = await savedSubscription(businessId);
  if (!saved?.stripe_subscription_id) return;
  await syncSubscription(await stripe().subscriptions.retrieve(saved.stripe_subscription_id));
}
