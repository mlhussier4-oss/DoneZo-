import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, FileText, Plus, Repeat, Users } from "lucide-react";
import { StatTile } from "@/components/charts/stat-tile";
import { JobStatusBadge } from "@/components/crm/status-badges";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { redirect } from "next/navigation";
import { requireProvider } from "@/lib/auth";
import { getDashboard } from "@/lib/crm/dashboard";
import { addDays } from "@/lib/dates";
import { formatMoney, formatTime, zonedToUtcIso } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Overview" };

export default async function ProviderOverviewPage() {
  const { user, business } = await requireProvider();
  if (business.memberRole === "employee") redirect("/provider/my-jobs");
  if (!business.hasCrm) redirect("/provider/marketplace"); // HomeHire Basic starts on the marketplace
  const tz = business.timezone;
  const d = await getDashboard(business.id);
  const supabase = await createClient();
  const { data: todayJobs } = await supabase
    .from("jobs")
    .select("id, title, status, scheduled_start, crm_customers(full_name)")
    .eq("business_id", business.id)
    .gte("scheduled_start", zonedToUtcIso(d.today, "00:00", tz))
    .lt("scheduled_start", zonedToUtcIso(addDays(d.today, 1), "00:00", tz))
    .neq("status", "canceled")
    .order("scheduled_start");
  const { data: stripeAcct } = await supabase.from("stripe_accounts").select("status").eq("business_id", business.id).maybeSingle();
  const firstName = user.fullName?.split(" ")[0];
  const isEmpty = d.active_customers === 0;

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        description={`${business.name} · ${business.plan.name}${business.marketplaceEnabled ? " with the marketplace" : ""}`}
        actions={<Link href="/provider/jobs/new" className={buttonVariants()}><Plus /> New job</Link>}
      />

      {isEmpty ? (
        <Card className="mb-6 border-primary/30 bg-primary-soft">
          <CardContent className="space-y-3">
            <p className="font-semibold">Get set up in a few minutes</p>
            <ol className="grid gap-2 text-sm sm:grid-cols-3">
              <li><Link href="/provider/customers/new" className="flex items-center gap-2 text-primary hover:underline"><Users className="size-4" aria-hidden />1. Add your customers</Link></li>
              <li><Link href="/provider/recurring/new" className="flex items-center gap-2 text-primary hover:underline"><Repeat className="size-4" aria-hidden />2. Set up repeat visits</Link></li>
              <li><Link href="/provider/invoices/new" className="flex items-center gap-2 text-primary hover:underline"><FileText className="size-4" aria-hidden />3. Send an invoice</Link></li>
            </ol>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Revenue this month" value={formatMoney(d.revenue_month_cents)} context={`${formatMoney(d.revenue_week_cents)} this week`} href="/provider/reports" />
        <StatTile label="Outstanding" value={formatMoney(d.outstanding_cents)} context={`${d.outstanding_invoices} unpaid ${d.outstanding_invoices === 1 ? "invoice" : "invoices"}`} href="/provider/invoices" />
        <StatTile label="Next 7 days" value={String(d.upcoming_jobs_7d)} context="scheduled visits" href="/provider/calendar" />
        <StatTile label="Completed this month" value={String(d.completed_jobs_month)} context={`${d.new_customers_month} new ${d.new_customers_month === 1 ? "customer" : "customers"}`} href="/provider/jobs?tab=past" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Today</CardTitle>
            <Link href="/provider/calendar?view=day" className="flex items-center gap-1 text-sm text-primary hover:underline"><CalendarDays className="size-4" aria-hidden />Calendar</Link>
          </CardHeader>
          <CardContent>
            {todayJobs?.length ? (
              <ul className="divide-y divide-border">
                {todayJobs.map((j) => (
                  <li key={j.id}>
                    <Link href={`/provider/jobs/${j.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-primary">
                      <span><span className="font-medium tabular-nums">{formatTime(j.scheduled_start!, tz)}</span> · {j.title} · <span className="text-muted-foreground">{j.crm_customers?.full_name}</span></span>
                      <JobStatusBadge status={j.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Nothing scheduled today.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Your account</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Active customers</span><span className="font-medium">{d.active_customers}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Marketplace</span>{business.marketplaceEnabled ? <Badge tone="success">On</Badge> : <Badge>Off</Badge>}</div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Card payments</span>{stripeAcct?.status === "active" ? <Badge tone="success">On</Badge> : <Badge>{stripeAcct ? "Setup incomplete" : "Not connected"}</Badge>}</div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Plan</span><Link href="/provider/plan"><Badge tone="primary">{business.plan.name}</Badge></Link></div>
            <Link href="/provider/settings" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-1" })}>Business settings</Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
