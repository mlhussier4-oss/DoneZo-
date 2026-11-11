import "server-only";
import { getOrCreateInvoiceCheckout } from "./checkout";
import { createServiceClient } from "@/lib/supabase/service";

export type CardPaymentState = "unavailable" | "not_requested" | "link_sent" | "failed" | "paid" | "refunded";

export const cardPaymentLabel: Record<CardPaymentState, string> = {
  unavailable: "Card payments off",
  not_requested: "Not requested",
  link_sent: "Payment link sent: awaiting payment",
  failed: "Payment failed",
  paid: "Paid",
  refunded: "Refunded",
};

/** Blueprint §18 statuses for an invoice's card payment. */
export function cardPaymentState(opts: {
  stripeActive: boolean;
  invoiceStatus: string;
  requests: { status: string }[];
}): CardPaymentState {
  if (opts.invoiceStatus === "refunded") return "refunded";
  if (opts.invoiceStatus === "paid") return "paid";
  if (!opts.stripeActive) return "unavailable";
  const latest = opts.requests[0];
  if (!latest) return "not_requested";
  if (latest.status === "failed") return "failed";
  if (latest.status === "open") return "link_sent";
  return "not_requested";
}

/** Look up an invoice by its customer link and return a Stripe checkout URL for the balance. */
export async function checkoutForPublicInvoice(token: string): Promise<{ url?: string; error?: string }> {
  if (!/^[0-9a-f]{48}$/.test(token)) return { error: "Unknown invoice." };
  const db = createServiceClient();
  const { data } = await db.rpc("invoice_for_payment", { p_token: token });
  const inv = data?.[0];
  if (!inv) return { error: "Unknown invoice." };
  if (!["sent", "partially_paid"].includes(inv.status) || inv.balance_cents <= 0) return { error: "This invoice doesn't have a balance to pay." };
  if (!inv.stripe_account_id || inv.stripe_status !== "active") return { error: "This business doesn't take card payments online yet." };
  const url = await getOrCreateInvoiceCheckout(
    {
      invoiceId: inv.invoice_id,
      businessId: inv.business_id,
      number: inv.number,
      balanceCents: inv.balance_cents,
      businessName: inv.business_name,
      stripeAccountId: inv.stripe_account_id,
      publicToken: token,
    },
    null,
  );
  return { url };
}
