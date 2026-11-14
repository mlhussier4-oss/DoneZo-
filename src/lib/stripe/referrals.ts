import "server-only";
import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { assertTestMode, stripe } from "./server";

/**
 * Provider referrals (owner decision 2026-11-14). Every 2 referred providers whose first subscription payment Stripe
 * confirms = 1 free month of the referrer's plan, given as a credit on their Stripe customer balance (Stripe uses it
 * automatically on their next bill). Each reward is applied exactly once (idempotency key = reward id).
 */
async function businessForCustomer(customerId: string): Promise<string | null> {
  const { data } = await createServiceClient().from("business_subscriptions").select("business_id").eq("stripe_customer_id", customerId).maybeSingle();
  return data?.business_id ?? null;
}

/** A platform invoice was paid: count it toward a referral, and give out any free month it completes. */
export async function handleSubscriptionInvoicePaid(invoice: Stripe.Invoice) {
  assertTestMode(invoice);
  if (!invoice.customer || (invoice.amount_paid ?? 0) <= 0) return; // a $0 invoice (e.g. paid by credit) doesn't count
  const businessId = await businessForCustomer(typeof invoice.customer === "string" ? invoice.customer : invoice.customer.id);
  if (!businessId) return;
  const { error } = await createServiceClient().rpc("record_referral_payment", { p_business_id: businessId });
  if (error) throw new Error(`Could not record referral payment: ${error.message}`);
  // The reward (if any) belongs to the referrer; apply all of their pending ones.
  const { data: ref } = await createServiceClient().from("referrals").select("referrer_business_id").eq("referred_business_id", businessId).maybeSingle();
  if (ref) await applyPendingReferralRewards(ref.referrer_business_id);
}

/** A platform charge was refunded: a referral's first payment refunded before use stops counting. */
export async function handleSubscriptionChargeRefunded(charge: Stripe.Charge) {
  assertTestMode(charge);
  if (!charge.customer) return;
  const businessId = await businessForCustomer(typeof charge.customer === "string" ? charge.customer : charge.customer.id);
  if (!businessId) return;
  const { error } = await createServiceClient().rpc("revoke_referral_payment", { p_business_id: businessId });
  if (error) throw new Error(error.message);
}

/** Puts earned free months on the referrer's Stripe balance. Safe to call any number of times. */
export async function applyPendingReferralRewards(businessId: string) {
  const db = createServiceClient();
  const { data: rewards } = await db.from("referral_rewards").select("id, amount_cents, plan_name").eq("business_id", businessId).in("status", ["pending", "failed"]);
  if (!rewards?.length) return;
  const { data: sub } = await db.from("business_subscriptions").select("stripe_customer_id").eq("business_id", businessId).maybeSingle();
  for (const r of rewards) {
    if (!sub?.stripe_customer_id) {
      await db.rpc("mark_referral_reward", { p_reward_id: r.id, p_status: "pending", p_balance_txn: null as unknown as string, p_error: "Waiting for this business to subscribe" });
      continue;
    }
    try {
      const txn = await stripe().customers.createBalanceTransaction(
        sub.stripe_customer_id,
        { amount: -r.amount_cents, currency: "usd", description: `HomeHire referral reward: 1 free month of ${r.plan_name}`, metadata: { referral_reward_id: r.id } },
        { idempotencyKey: `referral-reward-${r.id}` },
      );
      await db.rpc("mark_referral_reward", { p_reward_id: r.id, p_status: "applied", p_balance_txn: txn.id, p_error: null as unknown as string });
    } catch (e) {
      await db.rpc("mark_referral_reward", { p_reward_id: r.id, p_status: "failed", p_balance_txn: null as unknown as string, p_error: e instanceof Error ? e.message : String(e) });
    }
  }
}
