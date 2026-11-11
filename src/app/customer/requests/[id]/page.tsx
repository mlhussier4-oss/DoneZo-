import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, CheckCircle2, Clock, FileText, MapPin, Phone } from "lucide-react";
import { MessageThread } from "@/components/marketplace/message-thread";
import { ProviderAvatar } from "@/components/marketplace/provider-avatar";
import { Rating } from "@/components/marketplace/stars";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { timingLabel } from "@/config/marketplace";
import { requireRole } from "@/lib/auth";
import { jobStatus } from "@/lib/crm/labels";
import { uuid } from "@/lib/crm/schemas";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { getThread, signedRequestPhotos } from "@/lib/marketplace/queries";
import type { BidCardData, CustomerBooking } from "@/lib/marketplace/types";
import { createClient } from "@/lib/supabase/server";
import { LiveRefresh } from "@/components/marketplace/live-refresh";
import { JobCard } from "../../job-card";
import {
  CancelBookingButton, CancelRequestButton, ChangeOrderDecision, ReportProblemForm, ReviewForm,
} from "./request-controls";

export const metadata: Metadata = { title: "My request" };

const TZ = "America/Chicago";
const statusBadge = {
  open: <Badge tone="primary">Receiving bids</Badge>,
  pending: <Badge tone="accent">Waiting for confirmation</Badge>,
  booked: <Badge tone="success">Booked</Badge>,
  canceled: <Badge tone="danger">Canceled</Badge>,
  expired: <Badge>Expired</Badge>,
} as const;

export default async function CustomerRequestPage({ params, searchParams }: PageProps<"/customer/requests/[id]">) {
  const user = await requireRole("customer");
  const { id } = await params;
  const { posted } = await searchParams;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: req } = await supabase
    .from("service_requests")
    .select("*, service_categories(name, icon), service_request_locations(line1, line2, city, phone), request_photos(storage_path, created_at)")
    .eq("id", id)
    .single();
  if (!req) notFound();

  const photos = await signedRequestPhotos([...req.request_photos].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((p) => p.storage_path));
  const loc = req.service_request_locations;
  const expired = req.status === "open" && new Date(req.expires_at) < new Date();
  const status = expired ? "expired" : req.status;

  const [{ data: bidsJson }, { data: bookingJson }] = await Promise.all([
    supabase.rpc("request_bids", { p_request_id: id }),
    req.status === "booked" || req.status === "pending" ? supabase.rpc("customer_booking", { p_request_id: id }) : Promise.resolve({ data: null }),
  ]);
  const bids = (bidsJson ?? []) as unknown as BidCardData[];
  const booking = bookingJson as unknown as CustomerBooking | null;
  const thread = booking ? await getThread(booking.id) : [];
  const pendingChange = booking?.change_orders.find((c) => c.status === "pending");

  return (
    <>
      <div className="mb-6 space-y-2">
        <Link href="/customer/requests" className="text-sm text-muted-foreground hover:text-foreground">← My requests</Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{req.service_categories?.name}</h1>
          {statusBadge[status]}
        </div>
        <p className="text-sm text-muted-foreground">Posted {formatDate(req.created_at, TZ)} · {timingLabel(req.timing)}{req.preferred_date ? ` (${formatDate(req.preferred_date)})` : ""}</p>
      </div>

      {posted && req.status === "open" ? (
        <Alert tone="success" className="mb-6">
          Your job is posted. Nearby providers have been notified, and you&apos;ll see their bids here. We&apos;ll also notify you in DoneZo.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {/* OPEN or WAITING: the same live card as the dashboard (bids drop-down, countdown, chat) */}
          {(req.status === "open" && !expired) || req.status === "pending" ? (
            <>
              <LiveRefresh everyMs={4000} />
              <JobCard req={req} bids={bids} booking={booking} thread={thread} userId={user.id} />
            </>
          ) : null}
          {status === "expired" ? <Alert tone="info">This request expired without a booking. You can post it again any time.</Alert> : null}
          {status === "canceled" ? <Alert tone="info">You canceled this request.</Alert> : null}

          {/* BOOKED */}
          {booking && booking.status !== "pending" ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <ProviderAvatar name={booking.business.name} logoPath={booking.business.logo_path} />
                    <div className="flex-1">
                      <CardTitle><Link href={`/pros/${booking.business.id}`} className="hover:text-primary">{booking.business.name}</Link></CardTitle>
                      {booking.business.phone ? (
                        <a href={`tel:${booking.business.phone}`} className="mt-1 flex items-center gap-1.5 text-sm text-primary"><Phone className="size-4" aria-hidden />{booking.business.phone}</a>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold tabular-nums">{formatMoney(booking.agreed_price_cents)}</p>
                      {booking.agreed_price_cents !== booking.original_price_cents ? (
                        <p className="text-xs text-muted-foreground">Originally {formatMoney(booking.original_price_cents)}</p>
                      ) : <p className="text-xs text-muted-foreground">Agreed price</p>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {booking.status === "canceled" ? (
                    <Alert tone="error">This booking was canceled{booking.cancel_reason ? `: ${booking.cancel_reason}` : "."}</Alert>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1.5">
                        {booking.status === "completed" ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : <Clock className="size-4 text-primary" aria-hidden />}
                        {booking.status === "completed" ? "Job completed" : jobStatus(booking.job?.status ?? "new").label}
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <CalendarClock className="size-4" aria-hidden />
                        {booking.job?.scheduled_start ? formatDateTime(booking.job.scheduled_start, TZ) : "Time not set yet. Agree on it in messages."}
                      </span>
                    </div>
                  )}
                  <div className="rounded-lg bg-muted p-3 whitespace-pre-wrap">{booking.scope}</div>

                  {pendingChange ? (
                    <div className="space-y-2 rounded-lg border border-warning/30 bg-warning-soft p-3">
                      <p className="font-semibold text-warning">Your provider proposed a change</p>
                      <p>New price: <strong>{formatMoney(pendingChange.new_price_cents)}</strong> (was {formatMoney(booking.agreed_price_cents)})</p>
                      <p className="whitespace-pre-wrap">{pendingChange.description}</p>
                      <ChangeOrderDecision changeOrderId={pendingChange.id} />
                    </div>
                  ) : null}

                  {booking.invoices.length ? (
                    <div className="space-y-2">
                      {booking.invoices.map((i) => (
                        <Link key={i.number} href={`/i/${i.token}`} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted">
                          <span className="flex items-center gap-2"><FileText className="size-4" aria-hidden />Invoice #{i.number}</span>
                          <span>{i.status === "paid" ? <Badge tone="success">Paid</Badge> : <Badge tone="warning">{formatMoney(i.total_cents - i.amount_paid_cents)} due</Badge>}</span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                  {booking.status === "active" && !booking.job?.status?.match(/in_progress|awaiting_payment|completed/) ? (
                    <CancelBookingButton bookingId={booking.id} />
                  ) : null}
                </CardContent>
              </Card>

              {booking.status === "completed" ? (
                <Card>
                  <CardHeader><CardTitle>{booking.review ? "Your review" : "Leave a review"}</CardTitle></CardHeader>
                  <CardContent>
                    {booking.review ? (
                      <div className="space-y-1 text-sm">
                        <Rating rating={booking.review.rating} count={1} />
                        {booking.review.comment ? <p>{booking.review.comment}</p> : null}
                      </div>
                    ) : <ReviewForm bookingId={booking.id} businessName={booking.business.name} />}
                  </CardContent>
                </Card>
              ) : null}

              <Card id="messages">
                <CardHeader><CardTitle>Messages</CardTitle></CardHeader>
                <CardContent>
                  <MessageThread bookingId={booking.id} currentUserId={user.id} otherPartyName={booking.business.name} messages={thread} timeZone={TZ} />
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Your request</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap">{req.description}</p>
              {Object.entries((req.details ?? {}) as Record<string, string>).length ? (
                <p className="text-muted-foreground">{Object.values(req.details as Record<string, string>).join(" · ")}</p>
              ) : null}
              {loc ? (
                <p className="flex gap-2 text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{loc.line1}{loc.line2 ? `, ${loc.line2}` : ""}, {loc.city} {req.zip}<span className="block text-xs">Only shared with the provider you choose.</span></span>
                </p>
              ) : null}
              {photos.length ? (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                    <img key={url} src={url} alt={`Your photo ${i + 1}`} className="aspect-square w-full rounded-lg object-cover" />
                  ))}
                </div>
              ) : null}
              {req.status === "open" && !expired ? <CancelRequestButton requestId={req.id} /> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Need help?</CardTitle></CardHeader>
            <CardContent><ReportProblemForm bookingId={booking?.id} requestId={req.id} /></CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
