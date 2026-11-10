import { Badge } from "@/components/ui/badge";
import { estimateStatuses, invoiceStatuses, jobStatus, type EstimateStatus, type InvoiceStatus } from "@/lib/crm/labels";

export function JobStatusBadge({ status }: { status: string }) {
  const s = jobStatus(status);
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const s = invoiceStatuses[status as InvoiceStatus] ?? invoiceStatuses.draft;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function EstimateStatusBadge({ status }: { status: string }) {
  const s = estimateStatuses[status as EstimateStatus] ?? estimateStatuses.draft;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function VerificationBadge({ verification }: { verification: string }) {
  return verification === "stripe_verified" ? (
    <Badge tone="success">Verified by Stripe</Badge>
  ) : (
    <Badge tone="neutral">Recorded by you</Badge>
  );
}
