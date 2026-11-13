/** HomeHire's application fee on a card payment, in cents (rounded to the nearest cent). */
export function applicationFeeCents(amountCents: number, feeBps: number): number {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error("Amount must be a positive number of cents");
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10000) throw new Error("Fee must be between 0% and 100%");
  return Math.round((amountCents * feeBps) / 10000);
}

export const formatFeePercent = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
