import "server-only";
import { siteUrl } from "@/lib/env";
import { stripe, assertTestMode } from "@/lib/stripe/server";
import { createServiceClient } from "@/lib/supabase/service";
import { applicationFeeCents } from "./fees";

export type InvoiceForPayment = {
  invoiceId: string;
  businessId: string;
  number: number;
  balanceCents: number;
  businessName: string;
  stripeAccountId: string;
  publicToken: string;
};

/**
 * A secure Stripe Checkout page for an invoice's balance, created on the provider's own Stripe
 * account (direct charge) with HomeHire's fee as the application fee. An existing open link for
 * the same amount is reused. The invoice is only marked paid by the verified webhook.
 */
export async function getOrCreateInvoiceCheckout(inv: InvoiceForPayment, createdBy: string | null): Promise<string> {
  const db = createServiceClient();
  const { data: existing } = await db
    .from("payment_requests")
    .select("checkout_url, amount_cents, expires_at")
    .eq("invoice_id", inv.invoiceId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing && existing.amount_cents === inv.balanceCents && existing.expires_at && new Date(existing.expires_at).getTime() > Date.now() + 10 * 60_000) {
    return existing.checkout_url;
  }

  const { data: settings } = await db.from("platform_settings").select("card_fee_bps").single();
  const fee = applicationFeeCents(inv.balanceCents, settings?.card_fee_bps ?? 1000);
  const expiresAt = Math.floor(Date.now() / 1000) + 23 * 3600;
  const description = `Invoice #${inv.number} from ${inv.businessName}`;

  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: inv.balanceCents, product_data: { name: description } } }],
      payment_intent_data: {
        application_fee_amount: fee,
        description,
        metadata: { donezo_invoice_id: inv.invoiceId, donezo_business_id: inv.businessId },
      },
      metadata: { donezo_invoice_id: inv.invoiceId, donezo_business_id: inv.businessId },
      success_url: siteUrl(`/i/${inv.publicToken}?payment=submitted`).toString(),
      cancel_url: siteUrl(`/i/${inv.publicToken}`).toString(),
      expires_at: expiresAt,
    },
    { stripeAccount: inv.stripeAccountId },
  );
  assertTestMode(session);
  if (!session.url) throw new Error("Stripe did not return a checkout link.");

  const { error } = await db.from("payment_requests").insert({
    business_id: inv.businessId,
    invoice_id: inv.invoiceId,
    stripe_account_id: inv.stripeAccountId,
    checkout_session_id: session.id,
    checkout_url: session.url,
    amount_cents: inv.balanceCents,
    application_fee_cents: fee,
    expires_at: new Date(expiresAt * 1000).toISOString(),
    created_by: createdBy,
  });
  if (error) throw new Error(`Could not save the payment link: ${error.message}`);
  return session.url;
}
