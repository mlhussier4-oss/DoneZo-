import "server-only";
import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { assertTestMode, stripe } from "./server";
import { cardCheckMessage, holdPassed } from "./trial-check-outcome";

/**
 * Free-month card check (owner decision 2026-11-15). Right after a Basic free month starts, place a temporary hold for
 * the first charge on the saved card and release it immediately. Approved: the card is real and has funds.
 * Declined: the free month is cancelled at once and the provider is asked for another card. Runs once per subscription.
 */
export async function verifyTrialCard(sub: Stripe.Subscription, businessId: string): Promise<void> {
  if (sub.status !== "trialing") return;
  const db = createServiceClient();
  const { data: row } = await db.from("business_subscriptions").select("trial_card_check, stripe_subscription_id").eq("business_id", businessId).maybeSingle();
  if (row?.trial_card_check && row.stripe_subscription_id === sub.id) return;

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const amount = sub.items?.data?.[0]?.price?.unit_amount ?? 999;
  let paymentMethod = typeof sub.default_payment_method === "string" ? sub.default_payment_method : sub.default_payment_method?.id ?? null;
  if (!paymentMethod) {
    const customer = await stripe().customers.retrieve(customerId);
    const def = !("deleted" in customer && customer.deleted) ? (customer as Stripe.Customer).invoice_settings?.default_payment_method : null;
    paymentMethod = typeof def === "string" ? def : def?.id ?? null;
  }

  let passed = false;
  let declineCode: string | null = null;
  if (paymentMethod) {
    try {
      const pi = await stripe().paymentIntents.create(
        {
          amount, currency: "usd", customer: customerId, payment_method: paymentMethod,
          capture_method: "manual", confirm: true, off_session: true,
          description: "HomeHire card check: temporary hold, released immediately",
          metadata: { purpose: "trial_card_check", business_id: businessId, subscription_id: sub.id },
        },
        { idempotencyKey: `trial-card-check-${sub.id}` },
      );
      assertTestMode(pi);
      passed = holdPassed(pi.status);
      // Release the hold straight away (nothing is charged).
      if (pi.status === "requires_capture") await stripe().paymentIntents.cancel(pi.id).catch(() => undefined);
    } catch (e) {
      declineCode = (e as { decline_code?: string; code?: string }).decline_code ?? (e as { code?: string }).code ?? null;
    }
  }

  const message = passed ? null : cardCheckMessage(declineCode);
  await db.from("business_subscriptions").update({
    trial_card_check: passed ? "passed" : "failed",
    trial_card_checked_at: new Date().toISOString(),
    trial_card_message: message,
    ...(passed ? {} : { status: "canceled" as const }),
  }).eq("business_id", businessId);
  if (!passed) {
    await stripe().subscriptions.cancel(sub.id).catch(() => undefined);
    await db.rpc("notify_business", {
      p_business_id: businessId, p_kind: "card_check_failed", p_title: "Your card couldn't be verified",
      p_body: `${message} Your free month hasn't started yet.`, p_link: "/subscribe",
    });
  }
}
