/** A temporary hold proves the card is real and has funds when Stripe can authorize it (owner decision 2026-11-15). */
export function holdPassed(paymentIntentStatus: string | null | undefined): boolean {
  return paymentIntentStatus === "requires_capture" || paymentIntentStatus === "succeeded";
}

/** What the provider sees when their card couldn't be verified. Never includes card details. */
export function cardCheckMessage(declineCode?: string | null): string {
  if (declineCode === "insufficient_funds") return "Your card didn't have enough funds for the first payment. Please try another card.";
  return "Your card couldn't be verified. Please try another card.";
}
