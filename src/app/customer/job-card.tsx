import Link from "next/link";
import { CalendarCheck, ChevronDown, Inbox, MessageSquare, Timer } from "lucide-react";
import { CategoryIcon } from "@/components/brand/category-icon";
import { BidCard } from "@/components/marketplace/bid-card";
import { MessageThread } from "@/components/marketplace/message-thread";
import type { ThreadMessage } from "@/lib/marketplace/queries";
import { Badge } from "@/components/ui/badge";
import { timingLabel } from "@/config/marketplace";
import { isPast } from "@/lib/crm/time";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import type { BidCardData, CustomerBooking } from "@/lib/marketplace/types";
import { AcceptBidButton, CancelRequestButton, ReviewForm } from "./requests/[id]/request-controls";
import { WaitingPanel } from "./waiting-panel";
import { CancelRepeatButton, RepeatForm } from "./repeat-panel";
import { frequencyLabel } from "@/config/marketplace";
import { tomorrowKey } from "@/lib/crm/time";

const TZ = "America/Chicago";

export type LiveRequest = {
  id: string;
  status: string;
  description: string;
  timing: string;
  created_at: string;
  expires_at: string;
  zip: string;
  service_categories: { name: string; icon: string } | null;
};

/**
 * One job on the customer's dashboard (owner decision 2026-11-12): bids arrive live in a drop-down under the job;
 * picking one starts the provider's 5-minute confirmation. The chat opens under the job only once they confirm.
 */
export function JobCard({ req, bids, booking, thread, userId }: {
  req: LiveRequest; bids: BidCardData[]; booking: CustomerBooking | null; thread: ThreadMessage[]; userId: string;
}) {
  const open = req.status === "open" && !isPast(req.expires_at);
  const waiting = booking?.status === "pending";
  const confirmed = booking && booking.status !== "pending" && booking.status !== "canceled";
  const available = bids.filter((b) => b.status === "submitted");

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm" data-testid="job-card">
      <header className="flex items-start gap-3 border-b border-border p-4 sm:p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-cta">
          <CategoryIcon name={req.service_categories?.icon ?? "wrench"} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{req.service_categories?.name}</h2>
            {open ? <Badge tone="primary"><span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden />Live</Badge> : null}
            {waiting ? <Badge tone="accent">Waiting for confirmation</Badge> : null}
            {confirmed ? <Badge tone="success">{booking.status === "completed" ? "Completed" : "Booked"}</Badge> : null}
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">{req.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">Posted {formatDate(req.created_at, TZ)} · {timingLabel(req.timing as never)} · ZIP {req.zip}</p>
        </div>
        <Link href={`/customer/requests/${req.id}`} className="shrink-0 text-sm font-medium text-primary hover:underline">Details</Link>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        {open ? (
          <details open className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg bg-primary px-4 py-3 font-semibold text-white marker:hidden">
              <span>Bids ({available.length})</span>
              <ChevronDown className="size-5 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="mt-3 space-y-3">
              {/* How picking works (owner request 2026-11-13), shown above the bids. */}
              <div className="flex items-start gap-3 rounded-lg border border-cta/60 bg-accent-soft p-3 text-sm" data-testid="pick-note">
                <Timer className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <p>
                  <span className="font-semibold">When you pick a bid, that provider has 5 minutes to confirm your job.</span>{" "}
                  If time is running low, you can give them more time when asked. If they don&apos;t confirm, they lose the job and
                  you can pick any of your other bids, so you don&apos;t waste time.
                </p>
              </div>
              {available.length ? available.map((b) => (
                <BidCard key={b.id} bid={b}>
                  <AcceptBidButton bidId={b.id} businessName={b.business.name} priceCents={b.price_cents} />
                </BidCard>
              )) : (
                <div className="flex items-start gap-3 rounded-lg border border-dashed border-border p-4 text-sm">
                  <Inbox className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <p><span className="font-medium">Waiting for bids.</span> <span className="text-muted-foreground">Providers near you have been notified. New bids appear here automatically; no need to refresh or check email.</span></p>
                </div>
              )}
            </div>
          </details>
        ) : null}

        {waiting && booking?.confirm_by ? (
          <WaitingPanel bookingId={booking.id} providerName={booking.business.name} confirmBy={booking.confirm_by} serverNow={booking.server_now} />
        ) : null}

        {booking?.status === "completed" && !booking.review ? (
          <div className="space-y-3 rounded-lg border-2 border-cta bg-accent-soft p-4" data-testid="rate-provider">
            <p className="font-semibold">Job completed! How did {booking.business.name} do?</p>
            <ReviewForm bookingId={booking.id} businessName={booking.business.name} />
          </div>
        ) : null}

        {confirmed && booking.status !== "completed" ? (
          <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success-soft p-4">
            <CalendarCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold">{booking.business.name} confirmed · {formatMoney(booking.agreed_price_cents)}</p>
              <p>{booking.arrival_at ? `Arriving ${formatDateTime(booking.arrival_at, TZ)}` : booking.job?.scheduled_start ? `Scheduled ${formatDateTime(booking.job.scheduled_start, TZ)}` : "Time to be agreed in the chat."}</p>
            </div>
          </div>
        ) : null}

        {booking && confirmed ? <RepeatSection booking={booking} /> : null}

        {booking && confirmed ? (
          <section aria-label={`Chat with ${booking.business.name}`} className="rounded-lg border border-border">
            <p className="flex items-center gap-2 border-b border-border px-4 py-2 text-sm font-semibold"><MessageSquare className="size-4 text-primary" aria-hidden />Chat with {booking.business.name}</p>
            <div className="p-3">
              <MessageThread bookingId={booking.id} currentUserId={userId} otherPartyName={booking.business.name} messages={thread} timeZone={TZ} />
            </div>
          </section>
        ) : null}

        {waiting && available.length ? (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-muted-foreground marker:hidden">
              <span>Other bids ({available.length}), available if you drop this provider</span>
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="mt-3 space-y-3">{available.map((b) => <BidCard key={b.id} bid={b} />)}</div>
          </details>
        ) : null}

        {open ? <div className="flex justify-end"><CancelRequestButton requestId={req.id} /></div> : null}
      </div>
    </article>
  );
}

/** Repeat visits with the same provider: ask (after the invoice), wait for them to accept, then see each visit. */
export function RepeatSection({ booking }: { booking: CustomerBooking }) {
  const rr = booking.repeat_request;
  const invoiceSent = booking.invoices.length > 0;
  if (rr?.status === "pending") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted p-3 text-sm" data-testid="repeat-pending">
        <p>Waiting for {booking.business.name} to accept repeat visits: <strong>{frequencyLabel(rr.frequency)} · {rr.visits} visits</strong> from {formatDate(rr.first_date)}.</p>
        <CancelRepeatButton requestId={rr.id} />
      </div>
    );
  }
  if (rr?.status === "accepted") {
    return (
      <section className="rounded-lg border border-border" data-testid="repeat-visits" aria-label="Repeat visits">
        <p className="border-b border-border px-4 py-2 text-sm font-semibold">Repeat visits · {frequencyLabel(rr.frequency)} · {formatMoney(rr.price_cents)} each</p>
        <ul className="divide-y divide-border text-sm">
          {booking.visits.map((v, i) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <span>Visit {i + 1}: {v.scheduled_start ? formatDateTime(v.scheduled_start, TZ) : "Time to be agreed"}</span>
              <span className="flex items-center gap-2">
                {v.invoice && v.invoice.balance_cents > 0 && v.invoice.status !== "paid" ? (
                  <Link href={`/i/${v.invoice.token}`} className="font-medium text-primary hover:underline">Pay {formatMoney(v.invoice.balance_cents)}</Link>
                ) : null}
                <Badge tone={v.status === "completed" ? "success" : v.status === "canceled" ? "danger" : "primary"}>
                  {v.status === "completed" ? "Done" : v.status === "canceled" ? "Canceled" : "Scheduled"}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  if (!invoiceSent || !["active", "completed"].includes(booking.status)) return null;
  return (
    <div className="space-y-2">
      {rr?.status === "declined" ? <p className="text-sm text-muted-foreground">{booking.business.name} couldn&apos;t take your last repeat request. You can try different dates.</p> : null}
      <RepeatForm bookingId={booking.id} providerName={booking.business.name} priceCents={booking.agreed_price_cents} minDate={tomorrowKey(TZ)} />
    </div>
  );
}
