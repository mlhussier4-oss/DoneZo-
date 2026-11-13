import "server-only";
import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/database.types";
import { accountStatus } from "./account-status";
import { assertTestMode } from "./server";

type SubStatus = Database["public"]["Enums"]["subscription_status"];

/** Save a connected account's current status (from a verified webhook or a fresh API read). */
export async function syncStripeAccount(account: Stripe.Account) {
  assertTestMode(account as unknown as { livemode?: boolean });
  const db = createServiceClient();
  const { error } = await db
    .from("stripe_accounts")
    .update({
      status: accountStatus(account),
      charges_enabled: Boolean(account.charges_enabled),
      payouts_enabled: Boolean(account.payouts_enabled),
      details_submitted: Boolean(account.details_submitted),
      requirements_due: [...(account.requirements?.currently_due ?? []), ...(account.requirements?.past_due ?? [])],
      disabled_reason: account.requirements?.disabled_reason ?? null,
    })
    .eq("stripe_account_id", account.id);
  if (error) throw new Error(`Could not save Stripe account status: ${error.message}`);
}

/** Save a subscription's current status. The business comes from metadata or the saved customer id. */
export async function syncSubscription(sub: Stripe.Subscription) {
  assertTestMode(sub);
  const db = createServiceClient();
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  let businessId: string | null = sub.metadata?.business_id ?? null;
  if (!businessId) {
    const { data } = await db.from("business_subscriptions").select("business_id").eq("stripe_customer_id", customerId).maybeSingle();
    businessId = data?.business_id ?? null;
  }
  if (!businessId) throw new Error(`No HomeHire business for Stripe customer ${customerId}`);
  const periodEnd = (sub.items?.data?.[0] as { current_period_end?: number } | undefined)?.current_period_end
    ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  const { error } = await db.from("business_subscriptions").upsert({
    business_id: businessId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status as SubStatus,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
  });
  if (error) throw new Error(`Could not save subscription: ${error.message}`);
  // The plan follows the price actually being paid (Basic or Pro). Unknown prices are left alone.
  const lookupKey = (sub.items?.data?.[0]?.price as Stripe.Price | undefined)?.lookup_key;
  if (lookupKey && ["donezo_basic_monthly", "donezo_pro_monthly"].includes(lookupKey)) {
    const { error: planError } = await db.rpc("set_business_plan_by_lookup_key", { p_business_id: businessId, p_lookup_key: lookupKey });
    if (planError) throw new Error(`Could not save plan: ${planError.message}`);
  }
}
