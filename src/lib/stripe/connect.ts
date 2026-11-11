import "server-only";
import type Stripe from "stripe";
import { siteUrl } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { assertTestMode, stripe } from "./server";
import { syncStripeAccount } from "./sync";

/**
 * The provider's own Stripe account. Direct charges (owner decision): the provider is the seller
 * of record with their own Stripe dashboard, pays Stripe's processing fees and handles disputes;
 * DoneZo collects its fee as an application fee.
 */
async function accountFor(business: { id: string; name: string; email: string | null }): Promise<string> {
  const db = createServiceClient();
  const { data } = await db.from("stripe_accounts").select("stripe_account_id").eq("business_id", business.id).maybeSingle();
  if (data) return data.stripe_account_id;
  // Stripe Accounts v2 (required for new Connect platforms). "Full" dashboard and Stripe-collected
  // fees/losses = the provider runs their own Stripe account; DoneZo charges an application fee.
  const account = await stripe().v2.core.accounts.create(
    {
      display_name: business.name,
      contact_email: business.email ?? undefined,
      dashboard: "full",
      identity: { country: "us" },
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
      defaults: { currency: "usd", responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } },
      metadata: { donezo_business_id: business.id },
    },
    { idempotencyKey: `donezo-account-v2-${business.id}` },
  );
  assertTestMode(account as unknown as { livemode?: boolean });
  const { error } = await db.from("stripe_accounts").insert({ business_id: business.id, stripe_account_id: account.id });
  if (error) throw new Error(`Could not save the Stripe account: ${error.message}`);
  return account.id;
}

/** A one-time link to Stripe's hosted onboarding (bank details and identity are entered on Stripe, never DoneZo). */
export async function onboardingLink(business: { id: string; name: string; email: string | null }): Promise<string> {
  const account = await accountFor(business);
  const link = await stripe().v2.core.accountLinks.create({
    account,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        refresh_url: siteUrl("/provider/payments/stripe/refresh").toString(),
        return_url: siteUrl("/provider/payments?stripe=returned").toString(),
      },
    },
  });
  return link.url;
}

/** Re-read the account from Stripe (the v1 API reads v2 accounts too) and save its status. */
export async function refreshAccountStatus(businessId: string): Promise<void> {
  const db = createServiceClient();
  const { data } = await db.from("stripe_accounts").select("stripe_account_id").eq("business_id", businessId).maybeSingle();
  if (!data) return;
  await syncStripeAccount(await stripe().accounts.retrieve(data.stripe_account_id));
}

export async function recentPayouts(stripeAccountId: string): Promise<Stripe.Payout[]> {
  const payouts = await stripe().payouts.list({ limit: 5 }, { stripeAccount: stripeAccountId });
  return payouts.data;
}
