import type { Metadata } from "next";
import Link from "next/link";
import { ColumnChart } from "@/components/charts/column-chart";
import { MeterList } from "@/components/charts/meter-list";
import { StatTile } from "@/components/charts/stat-tile";
import { LiveRefresh } from "@/components/marketplace/live-refresh";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { formatDateTime, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { RevenueCard, isRevenueRange } from "./revenue-card";

export const metadata: Metadata = { title: "Business dashboard" };

type Day = { day: string; jobs: number; customers: number; providers: number; completed: number };
type Dash = {
  customers: number; customers_7d: number; providers: number; providers_7d: number;
  subscribed: number; subscribed_basic: number; subscribed_pro: number; subscribed_priority?: number; mrr_cents: number; in_free_month: number;
  jobs_today: number; jobs_7d: number; jobs_total: number; jobs_open: number; bids_today: number; bids_7d: number;
  waiting_confirm: number; in_progress: number; completed_total: number; completed_7d: number;
  card_volume_30d_cents: number; card_fees_30d_cents: number; open_reports: number;
  daily: Day[]; by_service: { name: string; jobs: number }[]; activity: { at: string; kind: string; text: string }[];
};

const TZ = "America/Chicago";
const short = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const series = (days: Day[], key: keyof Omit<Day, "day">) =>
  // 30 columns: label every 5th day (and today) under the chart; every day in tooltips and the table.
  days.map((d, i) => ({ key: d.day, label: short(d.day), value: d[key], display: String(d[key]), axisLabel: i % 5 === 4 || i === days.length - 1 ? short(d.day) : "" }));

/** Owner request 2026-11-14: a bird's-eye view of the whole business, refreshing itself every 15 seconds. */
export default async function AdminDashboardPage({ searchParams }: PageProps<"/admin">) {
  await requireRole("admin");
  const { rev } = await searchParams;
  const range = isRevenueRange(rev) ? rev : "30d";
  const { data, error } = await (await createClient()).rpc("admin_dashboard");
  if (error || !data) throw new Error("Could not load the dashboard.");
  const d = data as unknown as Dash;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

  return (
    <>
      <LiveRefresh everyMs={15000} />
      <PageHeader title="Business dashboard" description="Everything on HomeHire at a glance. Updates by itself every 15 seconds." />

      <section aria-label="Customers and providers" className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="admin-kpis">
        <StatTile label="Customers (with logins)" value={String(d.customers)} context={`+${d.customers_7d} this week`} href="/admin/users" />
        <StatTile label="Subscribed providers" value={String(d.subscribed)} context={`${d.subscribed_priority ?? 0} Priority · ${d.subscribed_pro} Pro · ${d.subscribed_basic} Basic`} href="/admin/businesses" />
        <StatTile label="Monthly subscriptions" value={formatMoney(d.mrr_cents)} context={`from paying providers · ${d.in_free_month} in their free month`} />
        <StatTile label="Provider sign-ups" value={String(d.providers)} context={`+${d.providers_7d} this week`} href="/admin/businesses" />
      </section>

      <RevenueCard range={range} />

      <section aria-label="Jobs" className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Jobs posted today" value={String(d.jobs_today)} context={`${d.jobs_7d} this week · ${d.jobs_total} total`} href="/admin/marketplace" />
        <StatTile label="Open jobs now" value={String(d.jobs_open)} context={`${plural(d.bids_today, "bid")} today`} href="/admin/marketplace?status=open" />
        <StatTile label="In progress" value={String(d.in_progress)} context={`${d.waiting_confirm} waiting for a pro to confirm`} href="/admin/marketplace?status=booked" />
        <StatTile label="Jobs done" value={String(d.completed_total)} context={`+${d.completed_7d} this week`} />
      </section>

      <section aria-label="Money and support" className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Card payments (30 days)" value={formatMoney(d.card_volume_30d_cents)} context="paid through HomeHire" href="/admin/payments" />
        <StatTile label="Your 10% fees (30 days)" value={formatMoney(d.card_fees_30d_cents)} />
        <StatTile label="Bids (7 days)" value={String(d.bids_7d)} />
        <StatTile label="Open support reports" value={String(d.open_reports)} href="/admin/reports" />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Jobs posted per day</CardTitle><CardDescription>Last 30 days</CardDescription></CardHeader>
          <CardContent><ColumnChart data={series(d.daily, "jobs")} formatTick={(v) => String(Math.round(v))} ariaLabel="Jobs posted per day, last 30 days" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Jobs completed per day</CardTitle><CardDescription>Last 30 days</CardDescription></CardHeader>
          <CardContent><ColumnChart data={series(d.daily, "completed")} formatTick={(v) => String(Math.round(v))} ariaLabel="Jobs completed per day, last 30 days" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>New customers per day</CardTitle><CardDescription>Last 30 days</CardDescription></CardHeader>
          <CardContent><ColumnChart data={series(d.daily, "customers")} formatTick={(v) => String(Math.round(v))} ariaLabel="New customers per day, last 30 days" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>New providers per day</CardTitle><CardDescription>Last 30 days</CardDescription></CardHeader>
          <CardContent><ColumnChart data={series(d.daily, "providers")} formatTick={(v) => String(Math.round(v))} ariaLabel="New providers per day, last 30 days" /></CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader><CardTitle>Jobs by service</CardTitle><CardDescription>Last 30 days</CardDescription></CardHeader>
          <CardContent>
            {d.by_service.length ? <MeterList rows={d.by_service.map((s) => ({ name: s.name, value: s.jobs, display: String(s.jobs) }))} />
              : <p className="text-sm text-muted-foreground">No jobs yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Latest activity</CardTitle><Link href="/admin/marketplace" className="text-sm text-primary hover:underline">Marketplace live →</Link></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm" data-testid="admin-activity">
              {d.activity.map((a, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-2">
                  <span>{a.text}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(a.at, TZ)}</span>
                </li>
              ))}
              {!d.activity.length ? <li className="py-2 text-muted-foreground">Nothing yet.</li> : null}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
