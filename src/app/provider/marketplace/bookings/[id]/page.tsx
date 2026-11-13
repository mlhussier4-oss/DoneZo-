import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { notFound } from "next/navigation";
import { Briefcase, Mail, MapPin, Phone } from "lucide-react";
import { JobStatusBadge } from "@/components/crm/status-badges";
import { MessageThread } from "@/components/marketplace/message-thread";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireManager } from "@/lib/auth";
import { uuid } from "@/lib/crm/schemas";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { getThread } from "@/lib/marketplace/queries";
import { createClient } from "@/lib/supabase/server";
import { defaultArrival } from "@/lib/crm/time";
import { CompleteJobPanel } from "@/components/marketplace/complete-job-panel";
import { ChangeOrderForm, ProviderCancelBookingButton, WithdrawChangeButton } from "./booking-controls";
import { ConfirmPanel } from "./confirm-panel";
import { RepeatDecision } from "./repeat-decision";

export const metadata: Metadata = { title: "Booking" };

export default async function ProviderBookingPage({ params }: PageProps<"/provider/marketplace/bookings/[id]">) {
  const { user, business } = await requireManager();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: b } = await supabase
    .from("bookings")
    .select("*, crm_customers(id, full_name, phone, email, crm_customer_addresses(line1, line2, city, state, postal_code)), jobs(id, status, scheduled_start), service_requests(zip, description, service_categories(name))")
    .eq("id", id)
    .single();
  if (!b) notFound();
  // Repeat visits share the original booking's chat (owner decision 2026-11-12).
  const chatId = b.parent_booking_id ?? id;
  const [{ data: changes }, thread, { data: repeatReqs }, { data: visitRows }, { data: cardData }] = await Promise.all([
    supabase.from("change_orders").select("id, new_price_cents, description, status, created_at").eq("booking_id", id).order("created_at", { ascending: false }),
    getThread(chatId),
    supabase.from("repeat_requests").select("id, status, frequency, visits, first_date, arrival_time, price_cents").eq("booking_id", id).order("created_at", { ascending: false }).limit(1),
    supabase.from("bookings").select("id, status, jobs(scheduled_start)").eq("parent_booking_id", id),
    // First name and photo only (owner decision 2026-11-13).
    supabase.rpc("booking_customer", { p_booking_id: id }),
  ]);
  const card = cardData as { first_name: string; avatar_path: string | null } | null;
  const repeatReq = repeatReqs?.[0];
  const visits = ((visitRows ?? []) as unknown as { id: string; status: string; jobs: { scheduled_start: string | null } | null }[])
    .sort((x, y) => (x.jobs?.scheduled_start ?? "").localeCompare(y.jobs?.scheduled_start ?? ""));
  const freqLabel = (f: string) => (f === "weekly" ? "Weekly" : f === "biweekly" ? "Every 2 weeks" : "Monthly");
  const c = b.crm_customers;
  const addr = c?.crm_customer_addresses?.[0];
  const pending = changes?.find((x) => x.status === "pending");
  const tz = business.timezone;
  const waiting = b.status === "pending";
  const lost = b.status === "lapsed";
  const arrival = defaultArrival(tz);
  const statusLabel = waiting ? "Confirm now" : lost ? "Lost" : b.status;
  const canComplete = b.status === "active" && Boolean(b.jobs) && !["awaiting_payment", "completed", "canceled"].includes(b.jobs?.status ?? "");
  const { data: stripeAcct } = await supabase.from("stripe_accounts").select("status").eq("business_id", business.id).maybeSingle();
  const cardsOn = stripeAcct?.status === "active";

  return (
    <>
      <div className="mb-6 space-y-2">
        <Link href="/provider/marketplace?tab=bookings" className="text-sm text-muted-foreground hover:text-foreground">← Bookings</Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{b.service_requests?.service_categories?.name}{card?.first_name ?? c?.full_name ? ` for ${card?.first_name ?? c?.full_name}` : ` in ${b.service_requests?.zip ?? ""}`}</h1>
              <Badge tone={b.status === "active" ? "primary" : b.status === "completed" ? "success" : waiting ? "accent" : "danger"} className="capitalize">{statusLabel}</Badge>
            </div>
            <p className="mt-1 text-lg font-medium">{formatMoney(b.agreed_price_cents)} <span className="text-sm font-normal text-muted-foreground">agreed price{b.agreed_price_cents !== b.original_price_cents ? ` (originally ${formatMoney(b.original_price_cents)})` : ""}</span></p>
          </div>
          {b.jobs ? <Link href={`/provider/jobs/${b.jobs.id}`} className={buttonVariants({ size: "sm" })}><Briefcase /> Open job to schedule, complete and invoice</Link> : null}
        </div>
      </div>

      {b.status === "canceled" ? <Alert tone="error" className="mb-6">This booking was canceled{b.cancel_reason ? `: ${b.cancel_reason}` : "."}</Alert> : null}
      {waiting && b.confirm_by ? (
        <div className="mb-6"><ConfirmPanel bookingId={b.id} confirmBy={b.confirm_by} serverNow={new Date().toISOString()} defaultDate={arrival.date} defaultTime={arrival.time} /></div>
      ) : null}
      {b.parent_booking_id ? (
        <Alert tone="info" className="mb-6">Repeat visit for the same customer. <Link href={`/provider/marketplace/bookings/${b.parent_booking_id}`} className="font-medium underline">Open the original job</Link>.</Alert>
      ) : null}
      {repeatReq?.status === "pending" ? (
        <Card className="mb-6 border-2 border-cta" data-testid="repeat-request">
          <CardHeader><CardTitle>The customer wants repeat visits</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><strong>{freqLabel(repeatReq.frequency)}</strong> · <strong>{repeatReq.visits} visits</strong> starting <strong>{formatDate(repeatReq.first_date)}</strong> around <strong>{repeatReq.arrival_time.slice(0, 5)}</strong> · {formatMoney(repeatReq.price_cents)} per visit, paid after each one.</p>
            <RepeatDecision requestId={repeatReq.id} />
          </CardContent>
        </Card>
      ) : null}
      {visits.length ? (
        <Card className="mb-6" data-testid="repeat-schedule">
          <CardHeader><CardTitle className="text-base">Repeat visits ({visits.length})</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {visits.map((v, i) => (
                <li key={v.id}>
                  <Link href={`/provider/marketplace/bookings/${v.id}`} className="flex items-center justify-between gap-2 py-2 hover:text-primary">
                    <span>Visit {i + 1}: {v.jobs?.scheduled_start ? formatDateTime(v.jobs.scheduled_start, tz) : "Not scheduled"}</span>
                    <Badge tone={v.status === "completed" ? "success" : v.status === "canceled" ? "danger" : "primary"} className="capitalize">{v.status === "active" ? "Scheduled" : v.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      {b.status === "completed" ? (
        <Alert tone="success" className="mb-6" data-testid="job-completed">Job completed. The customer has their invoice in the chat and was asked to rate you.</Alert>
      ) : null}
      {lost ? (
        <Alert tone="info" className="mb-6">
          {b.cancel_reason === "dropped" ? "The customer chose to move on, so this job went to another bid." : "This job wasn't confirmed in time, so it went back to the customer."} Keep an eye on your job board for new ones.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {canComplete ? (
            <Card className="border-2 border-cta" data-testid="finish-job">
              <CardHeader><CardTitle>Job finished?</CardTitle></CardHeader>
              <CardContent><CompleteJobPanel bookingId={b.id} amountCents={b.agreed_price_cents} cardsOn={cardsOn} /></CardContent>
            </Card>
          ) : null}
          {!lost && !waiting ? <Card>
            <CardHeader><CardTitle>Messages</CardTitle></CardHeader>
            <CardContent>
              <MessageThread bookingId={chatId} currentUserId={user.id} otherPartyName={card?.first_name ?? c?.full_name?.split(" ")[0] ?? "your customer"} messages={thread} timeZone={tz} />
            </CardContent>
          </Card> : null}
          <Card>
            <CardHeader><CardTitle>Agreed scope</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap rounded-lg bg-muted p-3">{b.scope}</p>
              <p className="text-muted-foreground">Customer&apos;s description: {b.service_requests?.description}</p>
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-6">
          {b.jobs?.status === "awaiting_payment" ? (
            <Alert tone="info">Waiting for the customer&apos;s card payment. You&apos;ll be notified when Stripe confirms it, and the job completes by itself.</Alert>
          ) : null}
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <Avatar path={card?.avatar_path} name={card?.first_name ?? c?.full_name ?? "Customer"} />
                <Link href={`/provider/customers/${c?.id}`} className="font-medium text-primary hover:underline">{card?.first_name ?? c?.full_name}</Link>
              </div>
              {c?.phone ? <a href={`tel:${c.phone}`} className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" aria-hidden />{c.phone}</a> : null}
              {c?.email ? <a href={`mailto:${c.email}`} className="flex items-center gap-2 break-all"><Mail className="size-4 text-muted-foreground" aria-hidden />{c.email}</a> : null}
              {addr ? <p className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.postal_code}</p> : null}
              {!addr ? <p className="text-muted-foreground">Your customer will send the address in the chat. Ask them there for anything else you need.</p> : null}
              {b.jobs ? <p className="flex items-center gap-2 pt-1"><JobStatusBadge status={b.jobs.status} />{b.jobs.scheduled_start ? formatDateTime(b.jobs.scheduled_start, tz) : "Not scheduled"}</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Price or scope change</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {pending ? (
                <div className="space-y-2 rounded-lg border border-warning/30 bg-warning-soft p-3">
                  <p className="font-medium text-warning">Waiting for the customer: {formatMoney(pending.new_price_cents)}</p>
                  <p>{pending.description}</p>
                  <WithdrawChangeButton changeOrderId={pending.id} />
                </div>
              ) : b.status === "active" ? <ChangeOrderForm bookingId={b.id} /> : <p className="text-muted-foreground">Only active bookings can be changed.</p>}
              {changes?.filter((x) => x.status !== "pending").map((x) => (
                <p key={x.id} className="text-muted-foreground">{formatMoney(x.new_price_cents)}: <span className="capitalize">{x.status}</span></p>
              ))}
            </CardContent>
          </Card>
          {b.status === "active" && !["in_progress", "awaiting_payment", "completed"].includes(b.jobs?.status ?? "") ? (
            <ProviderCancelBookingButton bookingId={b.id} />
          ) : null}
        </aside>
      </div>
    </>
  );
}
