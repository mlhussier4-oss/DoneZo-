"use server";

import { redirect } from "next/navigation";
import { checkoutForPublicInvoice } from "./invoice-payments";

/** Customer taps "Pay by card" on an invoice link (no sign-in needed; the link token identifies the invoice). */
export async function payInvoiceByCard(token: string): Promise<{ error?: string }> {
  let url: string | undefined;
  try {
    const result = await checkoutForPublicInvoice(token);
    if (result.error) return { error: result.error };
    url = result.url;
  } catch (err) {
    console.error("public checkout failed", err);
    return { error: "We couldn't open the secure payment page. Please try again in a moment." };
  }
  redirect(url!);
}
