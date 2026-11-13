import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus, Smartphone } from "lucide-react";
import { LiveRefresh } from "@/components/marketplace/live-refresh";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PushToggle } from "@/components/push/push-toggle";
import { requireRole } from "@/lib/auth";
import { isPast } from "@/lib/crm/time";
import { formatMoney } from "@/lib/format";
import { getThread } from "@/lib/marketplace/queries";
import type { BidCardData, CustomerBooking } from "@/lib/marketplace/types";
import { createClient } from "@/lib/supabase/server";
import { JobCard, type LiveRequest } from "./job-card";

export const metadata: Metadata = { title: "My jobs" };

export default async function CustomerHomePage({ searchParams }: PageProps<"/customer">) {
  const user = await requireRole("customer");
  const { posted } = await searchParams;
  const supabase = await createClient();
  const [{ data: reqs }, { data: invoices }] = await Promise.all([
    supabase.from("service_requests")
      .select("id, status, description, timing, created_at, expires_at, zip, service_categories(name, icon)")
      .eq("customer_id", user.id).in("status", ["open", "pending", "booked"])
      .order("created_at", { ascending: false }).limit(10),
    supabase.rpc("customer_invoices"),
  ]);

  // Each current job with its live bids, its booking (if any) and the chat.
  const jobs = await Promise.all(((reqs ?? []) as LiveRequest[]).map(async (req) => {
    const [{ data: bidsJson }, { data: bookingJson }] = await Promise.all([
      supabase.rpc("request_bids", { p_request_id: req.id }),
      req.status === "open" ? Promise.resolve({ data: null }) : supabase.rpc("customer_booking", { p_request_id: req.id }),
    ]);
    const booking = bookingJson as unknown as CustomerBooking | null;
    const thread = booking && booking.status !== "canceled" ? await getThread(booking.id) : [];
    return { req, bids: (bidsJson ?? []) as unknown as BidCardData[], booking, thread };
  }));
  // Booked jobs stay here until the work is done and rated; after that they live under "All my jobs".
  const current = jobs.filter((j) => j.req.status !== "booked" || j.booking?.status === "active"
      || (j.booking?.status === "completed" && (!j.booking.review || j.booking.repeat_request?.status === "pending" || j.booking.visits.some((v) => v.status === "active"))))
    .filter((j) => j.req.status !== "open" || !isPast(j.req.expires_at));
  const live = current.some((j) => j.req.status === "open" || j.booking?.status === "pending");
  const due = (invoices ?? []).filter((i) => i.status === "sent" || i.status === "partially_paid");
  const firstName = user.fullName?.split(" ")[0];

  return (
    <>
      {live ? <LiveRefresh everyMs={4000} /> : null}
      <PageHeader
        title={firstName ? `Hi, ${firstName}` : "My jobs"}
        description="Bids show up here the moment providers send them."
        actions={<Link href="/post-job" className={buttonVariants()}><Plus /> Post a job</Link>}
      />
      {posted ? (
        <Card className="mb-6 border-success/30 bg-success-soft">
          <CardContent className="text-sm"><span className="font-semibold">Your job is posted.</span> Providers near you have been notified. Keep this page open; bids appear below as they arrive.</CardContent>
        </Card>
      ) : null}
      <PushToggle text="We'll let you know the moment a new bid arrives and when your pro sends you a message." />
      {!user.email ? (
        <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground"><Smartphone className="size-4" aria-hidden />Your jobs are saved on this device. Use the same phone or browser to come back to them.</p>
      ) : null}
      {due.length ? (
        <Card className="mb-6 border-warning/30 bg-warning-soft">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">You have {due.length} unpaid {due.length === 1 ? "invoice" : "invoices"}: {formatMoney(due.reduce((s, i) => s + i.total_cents - i.amount_paid_cents, 0))}</p>
            <Link href="/customer/payments" className={buttonVariants({ size: "sm", variant: "outline" })}>View</Link>
          </CardContent>
        </Card>
      ) : null}
      {current.length ? (
        <div className="space-y-6">
          {current.map((j) => <JobCard key={j.req.id} req={j.req} bids={j.bids} booking={j.booking} thread={j.thread} userId={user.id} />)}
        </div>
      ) : (
        <EmptyState icon={ClipboardList} title="No jobs in progress" action={<Link href="/post-job" className={buttonVariants({ size: "sm" })}>Post a job</Link>}>
          Post a job in about a minute. Nearby providers send bids, and you choose. No card or email needed.
        </EmptyState>
      )}
      <p className="mt-6 text-sm"><Link href="/customer/requests" className="text-primary hover:underline">All my jobs →</Link></p>
      <div className="mt-8 border-t border-border pt-4"><PushToggle variant="setting" text="Notifications for new bids and messages:" /></div>
    </>
  );
}
