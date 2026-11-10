import type { Metadata } from "next";
import { ColumnChart } from "@/components/charts/column-chart";
import { MeterList } from "@/components/charts/meter-list";
import { StatTile } from "@/components/charts/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireProvider } from "@/lib/auth";
import { getDashboard } from "@/lib/crm/dashboard";
import { formatIso } from "@/lib/dates";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Reports" };

const compactUsd = (cents: number) => {
  const dollars = cents / 100;
  return dollars >= 10000 ? `$${Math.round(dollars / 1000)}K` : `$${dollars.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

export default async function ReportsPage() {
  const { business } = await requireProvider();
  const d = await getDashboard(business.id);
  const months = d.revenue_by_month.map((m) => ({
    key: m.month,
    label: formatIso(`${m.month}-01`, { month: "short" }),
    value: m.cents,
    display: formatMoney(m.cents),
  }));

  return (
    <>
      <PageHeader title="Reports" description="Revenue means payments you've received: recorded payments now, Stripe card payments once connected." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Revenue this month" value={formatMoney(d.revenue_month_cents)} />
        <StatTile label="Revenue this week" value={formatMoney(d.revenue_week_cents)} context="since Monday" />
        <StatTile label="Average job value" value={formatMoney(d.average_job_cents)} context="completed jobs, last 90 days" />
        <StatTile label="Outstanding" value={formatMoney(d.outstanding_cents)} context={`${d.outstanding_invoices} unpaid ${d.outstanding_invoices === 1 ? "invoice" : "invoices"}`} />
        <StatTile label="Completed jobs" value={String(d.completed_jobs_month)} context="this month" />
        <StatTile label="New customers" value={String(d.new_customers_month)} context="this month" />
        <StatTile label="Repeat customers" value={String(d.repeat_customers)} context="2+ completed jobs" />
        <StatTile label="Active customers" value={String(d.active_customers)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly revenue</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ColumnChart data={months} formatTick={compactUsd} ariaLabel="Monthly revenue for the last 6 months" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue by service</CardTitle>
            <CardDescription>Last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            {d.revenue_by_category.length ? (
              <MeterList rows={d.revenue_by_category.map((c) => ({ name: c.name, value: c.cents, display: formatMoney(c.cents) }))} />
            ) : (
              <p className="text-sm text-muted-foreground">No payments in the last 12 months yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
