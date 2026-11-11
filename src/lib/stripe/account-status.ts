/** The five statuses from Blueprint §16 (plus "not connected", which means no row at all). */
export type StripeAccountStatus = "onboarding_incomplete" | "pending_verification" | "active" | "restricted";

type AccountLike = {
  charges_enabled?: boolean | null;
  details_submitted?: boolean | null;
  requirements?: { disabled_reason?: string | null; currently_due?: string[] | null; past_due?: string[] | null } | null;
};

export function accountStatus(a: AccountLike): StripeAccountStatus {
  const reason = a.requirements?.disabled_reason ?? null;
  if (a.charges_enabled) return "active";
  if (!a.details_submitted) return "onboarding_incomplete";
  if (!reason || reason === "requirements.pending_verification" || reason === "under_review") return "pending_verification";
  return "restricted";
}

export const accountStatusLabel: Record<StripeAccountStatus | "not_connected", { label: string; tone: "neutral" | "warning" | "primary" | "success" | "danger"; help: string }> = {
  not_connected: { label: "Not connected", tone: "neutral", help: "Connect a Stripe account to take card payments." },
  onboarding_incomplete: { label: "Onboarding incomplete", tone: "warning", help: "Finish the Stripe sign-up to start taking card payments." },
  pending_verification: { label: "Pending verification", tone: "primary", help: "Stripe is checking your details. This usually takes minutes, sometimes a day or two." },
  active: { label: "Active", tone: "success", help: "You can take card payments." },
  restricted: { label: "Restricted", tone: "danger", help: "Stripe needs more information before you can take card payments." },
};
