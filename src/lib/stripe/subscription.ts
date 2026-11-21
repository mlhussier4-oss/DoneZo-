import "server-only";
import type Stripe from "stripe";
import { siteUrl } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { assertTestMode, stripe } from "./server";
import { syncSubscription } from "./sync";
import { FREE_MONTH_PLAN, FREE_TRIAL_DAYS, PLAN_CODES, planInfo, type PlanCode } from "@/config/plans";

export type { PlanCode };
export const planCodes: PlanCode[] = [...PLAN_CODES];
/** Monthly, or yearly at the price of 10 months (owner decision 2026-11-14: pay for 12, get 2 free). */
export type BillingInterval = "month" | "year";
export const YEARLY_MONTHS_CHARGED = 10;

/** The plan's price in Stripe (found by its lookup key), created on first use and replaced if the amount changes. */
async function planPrice(code: PlanCode, interval: BillingInterval = "month"): Promise<Stripe.Price> {
  const db = createServiceClient();
  const { data: plan } = await db.from("plans").select("name, price_cents, stripe_lookup_key, stripe_yearly_lookup_key").eq("code", code).single();
  const lookupKey = interval === "year" ? plan?.stripe_yearly_lookup_key : plan?.stripe_lookup_key;
  if (!plan?.price_cents || !lookupKey) throw new Error(`Plan ${code} has no ${interval}ly price.`);
  const amount = interval === "year" ? plan.price_cents * YEARLY_MONTHS_CHARGED : plan.price_cents;
  const existing = await stripe().prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const price = existing.data[0];
  if (price && price.unit_amount === amount && price.recurring?.interval === interval) return price;
  // Reuse the plan's product (from either price) so monthly and yearly sit together in Stripe.
  const sibling = price ?? (await stripe().prices.list({ lookup_keys: [plan.stripe_lookup_key!], active: true, limit: 1 })).data[0];
  const productId = typeof sibling?.product === "string" ? sibling.product : (await stripe().products.create({ name: plan.name, metadata: { donezo_plan: code } })).id;
  return stripe().prices.create({
    product: productId,
    unit_amount: amount,
    currency: "usd",
    recurring: { interval },
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    nickname: interval === "year" ? `${plan.name} yearly (2 months free)` : `${plan.name} monthly`,
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
export async function startSubscriptionCheckout(business: { id: string; name: string; email: string | null }, plan: PlanCode, interval: BillingInterval = "month"): Promise<string> {
  const [price, customer] = await Promise.all([planPrice(plan, interval), customerFor(business)]);
  // First month free, once per business (owner decision 2026-11-15): anyone who has subscribed before pays straight away.
  const { data: before } = await createServiceClient().from("business_subscriptions").select("stripe_subscription_id, trial_card_check").eq("business_id", business.id).maybeSingle();
  // Basic only; someone whose card failed the check can try again with another card.
  const freeMonth = plan === FREE_MONTH_PLAN && (!before?.stripe_subscription_id || before.trial_card_check === "failed");
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: price.id, quantity: 1 }],
    client_reference_id: business.id,
    payment_method_collection: "always", // card collected now, first charge after the free month
    subscription_data: {
      metadata: { business_id: business.id, plan },
      ...(freeMonth ? { trial_period_days: FREE_TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } } } : {}),
    },
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
  const [basicPrice, proPrice, priorityPrice] = await Promise.all([planPrice("basic"), planPrice("pro"), planPrice("priority")]);
  const tag = `plans-${basicPrice.id}-${proPrice.id}-${priorityPrice.id}`;
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
          { product: productOf(priorityPrice), prices: [priorityPrice.id] },
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
  const sub = await stripe().subscriptions.retrieve(saved.stripe_subscription_id);
  assertTestMode(sub);
  // Switching plans keeps the billing interval the provider already has (monthly or yearly).
  // HomeHire Priority is monthly only (owner decision 2026-11-21).
  const interval: BillingInterval = sub.items.data[0]?.price?.recurring?.interval === "year" && planInfo[plan].yearly ? "year" : "month";
  const [price, configuration] = await Promise.all([planPrice(plan, interval), portalConfiguration()]);
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
