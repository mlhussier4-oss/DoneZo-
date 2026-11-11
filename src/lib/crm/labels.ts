export type JobStatus = "new" | "scheduled" | "in_progress" | "awaiting_payment" | "completed" | "canceled";
export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "void";
export type EstimateStatus = "draft" | "sent" | "accepted" | "declined" | "converted";
export type PaymentMethod = "cash" | "venmo" | "cash_app" | "check" | "card" | "other";
export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "accent";

export const jobStatuses: { value: JobStatus; label: string; tone: Tone }[] = [
  { value: "new", label: "New", tone: "neutral" },
  { value: "scheduled", label: "Scheduled", tone: "primary" },
  { value: "in_progress", label: "In progress", tone: "accent" },
  { value: "awaiting_payment", label: "Awaiting payment", tone: "warning" },
  { value: "completed", label: "Completed", tone: "success" },
  { value: "canceled", label: "Canceled", tone: "danger" },
];
export const jobStatus = (s: string) => jobStatuses.find((x) => x.value === s) ?? jobStatuses[0];

export const invoiceStatuses: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Unpaid", tone: "warning" },
  partially_paid: { label: "Partly paid", tone: "accent" },
  paid: { label: "Paid", tone: "success" },
  void: { label: "Void", tone: "danger" },
};

export const estimateStatuses: Record<EstimateStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "primary" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  converted: { label: "Invoiced", tone: "success" },
};

/** Methods a provider can record by hand. Card payments only ever come from Stripe (Phase 4). */
export const recordableMethods: { value: Exclude<PaymentMethod, "card">; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "venmo", label: "Venmo" },
  { value: "cash_app", label: "Cash App" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" },
];
export const paymentMethodLabel = (m: string) =>
  m === "card" ? "Card (Stripe)" : (recordableMethods.find((x) => x.value === m)?.label ?? m);

export const frequencyLabels = {
  weekly: "Every week",
  biweekly: "Every 2 weeks",
  monthly: "Every month",
  custom: "Custom interval",
} as const;
