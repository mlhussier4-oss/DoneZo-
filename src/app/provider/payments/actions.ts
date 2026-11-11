"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireManager } from "@/lib/auth";
import { onboardingLink, refreshAccountStatus } from "@/lib/stripe/connect";
import { stripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function connectStripe(): Promise<{ error?: string }> {
  const { business } = await requireManager();
  if (business.memberRole === "employee") return { error: "Only the owner or a manager can connect Stripe." };
  let url: string;
  try {
    url = await onboardingLink({ id: business.id, name: business.name, email: business.email });
  } catch (err) {
    console.error("stripe onboarding failed", err);
    return { error: "We couldn't reach Stripe. Please try again in a moment." };
  }
  redirect(url);
}

export async function checkStripeStatus(): Promise<void> {
  const { business } = await requireManager();
  try {
    await refreshAccountStatus(business.id);
  } catch (err) {
    console.error("stripe status refresh failed", err);
  }
  refresh();
}

/** Full refund of a Stripe card payment, including DoneZo's fee (owner decision). Confirmed by webhook. */
export async function refundCardPayment(paymentRecordId: string): Promise<{ error?: string; ok?: boolean }> {
  const { business } = await requireManager();
  if (business.memberRole === "employee") return { error: "Only the owner or a manager can issue refunds." };
  if (!z.string().uuid().safeParse(paymentRecordId).success) return { error: "Unknown payment." };
  const supabase = await createClient();
  // Read through RLS: proves this payment belongs to the signed-in provider's business.
  const { data: rec } = await supabase
    .from("payment_records")
    .select("id, business_id, verification, stripe_payment_intent_id, amount_cents, refunded_cents")
    .eq("id", paymentRecordId)
    .single();
  if (!rec || rec.business_id !== business.id) return { error: "Unknown payment." };
  if (rec.verification !== "stripe_verified" || !rec.stripe_payment_intent_id) return { error: "Only card payments can be refunded here." };
  if (rec.refunded_cents >= rec.amount_cents) return { error: "This payment has already been refunded." };
  const { data: acct } = await supabase.from("stripe_accounts").select("stripe_account_id").eq("business_id", business.id).single();
  if (!acct) return { error: "Stripe isn't connected." };
  try {
    await stripe().refunds.create(
      { payment_intent: rec.stripe_payment_intent_id, refund_application_fee: true, metadata: { donezo_payment_record_id: rec.id } },
      { stripeAccount: acct.stripe_account_id, idempotencyKey: `donezo-refund-${rec.id}` },
    );
  } catch (err) {
    console.error("refund failed", err);
    return { error: err instanceof Error ? err.message : "Stripe couldn't process the refund." };
  }
  return { ok: true };
}
