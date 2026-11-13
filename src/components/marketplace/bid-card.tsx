import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { ProviderAvatar } from "@/components/marketplace/provider-avatar";
import { Rating } from "@/components/marketplace/stars";
import { Badge } from "@/components/ui/badge";
import { paymentMethodName } from "@/config/marketplace";
import { formatMoney } from "@/lib/format";
import { publicMediaUrl } from "@/lib/marketplace/queries";
import type { BidCardData } from "@/lib/marketplace/types";

/** One provider's sealed bid, as the customer sees it. The "choose" button goes in `children`. */
export function BidCard({ bid: b, children }: { bid: BidCardData; children?: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5" data-testid="bid-card">
      <div className="flex items-start gap-3">
        <ProviderAvatar name={b.business.name} logoPath={b.business.logo_path} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/pros/${b.business.id}`} className="font-semibold hover:text-primary hover:underline">{b.business.name}</Link>
            {b.business.verified ? <Badge tone="success"><BadgeCheck className="size-3.5" aria-hidden />Verified</Badge> : null}
          </div>
          <Rating rating={b.business.stats.rating} count={b.business.stats.review_count} />
          <p className="text-sm text-muted-foreground">
            {b.business.stats.completed_jobs} {b.business.stats.completed_jobs === 1 ? "job" : "jobs"} on HomeHire
            {b.business.years_experience ? ` · ${b.business.years_experience} yrs experience` : ""}
          </p>
        </div>
        <p className="text-2xl font-bold tabular-nums text-primary">{formatMoney(b.price_cents)}</p>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Included</dt><dd className="whitespace-pre-wrap">{b.included}</dd></div>
        <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Availability</dt><dd>{b.availability}</dd></div>
        {b.exclusions ? <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Not included</dt><dd>{b.exclusions}</dd></div> : null}
        {b.additional_charges ? <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Possible extra charges</dt><dd>{b.additional_charges}</dd></div> : null}
      </dl>
      {b.message ? <p className="rounded-lg bg-muted p-3 text-sm">&ldquo;{b.message}&rdquo;</p> : null}
      {b.business.portfolio.length ? (
        <div className="flex gap-2">
          {b.business.portfolio.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element -- public portfolio photo
            <img key={p} src={publicMediaUrl(p)!} alt={`Past work by ${b.business.name}`} className="size-16 rounded-lg object-cover" />
          ))}
        </div>
      ) : null}
      {b.business.accepted_payment_methods.length ? (
        <p className="text-xs text-muted-foreground">Accepts: {b.business.accepted_payment_methods.map(paymentMethodName).join(", ")}</p>
      ) : null}
      {children}
    </div>
  );
}
