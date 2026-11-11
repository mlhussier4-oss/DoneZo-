import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { ColumnChart } from "@/components/charts/column-chart";
import { MeterList } from "@/components/charts/meter-list";
import { StatTile } from "@/components/charts/stat-tile";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { requireManager } from "@/lib/auth";
import { paymentMethodLabel } from "@/lib/crm/labels";
import { getReport, rangePresets, resolveRange } from "@/lib/crm/report";
import { formatIso } from "@/lib/dates";
import { formatMoney, localDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

const compactUsd = (cents: number) => {
  const dollars = cents / 100;
  return dollars >= 10000 ? `$${Math.round(dollars / 1000)}K` : `$${dollars.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

export default async function ReportsPage({ searchParams }: PageProps<"/provider/reports">) {
  const { business } = await requireManager();
  const params = await searchParams;
  const today = localDateKey(new Date(), business.timezone);
  const range = resolveRange(params, today);
  const { report: r, error } = await getReport(business.id, range.from, range.to);
  const rangeQs = range.preset === "custom" ? `from=${range.from}&to=${range.to}` : `range=${range.preset}`;
  const rangeLabel = `${formatIso(range.from, { month: "short", day: "numeric", year: "numeric" })} – ${formatIso(range.to, { month: "short", day: "numeric", year: "numeric" })}`;

  const periodLabel = (p: string) =>
    r?.unit === "month" ? formatIso(p, { month: "short" }) : r?.unit === "week" ? `Wk of ${formatIso(p, { month: "short", day: "numeric" })}` : formatIso(p, { month: "short", day: "numeric" });
  const a = r?.aging;
  const aging = a ? [
    { label: "Not yet due", cents: a.current_cents, count: a.current_count, tone: "" },
    { label: "1–30 days late", cents: a.d1_30_cents, count: a.d1_30_count, tone: "text-warning" },
    { label: "31–60 days late", cents: a.d31_60_cents, count: a.d31_60_count, tone: "text-destructive" },
    { label: "Over 60 days late", cents: a.d61_cents, count: a.d61_count, tone: "text-destructive" },
  ] : [];

  return (
    <>
      <PageHeader
        title="Reports"
        description="Revenue means payments received in the period, minus refunds: card payments verified by Stripe plus cash, Venmo and other payments you recorded."
        actions={<a href={`/provider/reports/export?${rangeQs}`} className={buttonVariants({ variant: "outline" })} download><Download /> Download CSV</a>}
      />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <nav className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1 text-sm" aria-label="Date range">
          {rangePresets.map((p) => (
            <Link key={p.value} href={`/provider/reports?range=${p.value}`} aria-current={range.preset === p.value ? "page" : undefined}
              className={cn("shrink-0 rounded-md px-3 py-1.5 font-medium", range.preset === p.value ? "bg-card shadow-sm" : "text-muted-foreground")}>
              {p.label}
            </Link>
          ))}
        </nav>
        <form className="flex flex-wrap items-end gap-2 text-sm" action="/provider/reports">
          <label className="grid gap-1"><span className="text-muted-foreground">From</span><Input type="date" name="from" defaultValue={range.from} className="h-9" required /></label>
          <label className="grid gap-1"><span className="text-muted-foreground">To</span><Input type="date" name="to" defaultValue={range.to} className="h-9" required /></label>
          <button type="submit" className={buttonVariants({ variant: "outline", size: "sm", className: "h-9" })}>Apply</button>
        </form>
      </div>
      <p className="mb-4 text-sm font-medium" data-testid="report-range">{rangeLabel}</p>

      {error || !r ? <Alert tone="error">{error ?? "Could not load this report."}</Alert> : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Revenue" value={formatMoney(r.summary.net_cents)} context={r.summary.refunded_cents ? `${formatMoney(r.summary.refunded_cents)} refunded` : `${r.summary.payments} ${r.summary.payments === 1 ? "payment" : "payments"}`} />
            <StatTile label="Card (Stripe-verified)" value={formatMoney(r.summary.card_cents)} context={`DoneZo fee ${formatMoney(r.summary.fee_cents)}`} />
            <StatTile label="Recorded by you" value={formatMoney(r.summary.recorded_cents)} context="cash, Venmo, Cash App, check" />
            <StatTile label="Invoiced" value={formatMoney(r.summary.invoiced_cents)} context="invoices issued" />
            <StatTile label="Completed jobs" value={String(r.summary.completed_jobs)} context={`${formatMoney(r.summary.completed_value_cents)} of work`} />
            <StatTile label="Average job" value={formatMoney(r.summary.average_job_cents)} context="completed jobs" />
            <StatTile label="New customers" value={String(r.summary.new_customers)} />
            <StatTile label="Unpaid today" value={formatMoney(aging.reduce((s, x) => s + x.cents, 0))} context={`${aging.reduce((s, x) => s + x.count, 0)} open invoices`} />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Revenue over time</CardTitle>
              <CardDescription>By {r.unit}</CardDescription>
            </CardHeader>
            <CardContent>
              <ColumnChart data={r.series.map((s) => ({ key: s.period, label: periodLabel(s.period), value: s.cents, display: formatMoney(s.cents) }))} formatTick={compactUsd} ariaLabel={`Revenue by ${r.unit}`} />
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>By payment method</CardTitle></CardHeader>
              <CardContent>
                {r.by_method.length ? <MeterList rows={r.by_method.map((m) => ({ name: `${paymentMethodLabel(m.method)} (${m.count})`, value: m.cents, display: formatMoney(m.cents) }))} />
                  : <p className="text-sm text-muted-foreground">No payments in this period.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>By service</CardTitle></CardHeader>
              <CardContent>
                {r.by_service.length ? <MeterList rows={r.by_service.map((c) => ({ name: c.name, value: c.cents, display: formatMoney(c.cents) }))} />
                  : <p className="text-sm text-muted-foreground">No payments in this period.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>By team member</CardTitle>
                <CardDescription>Completed jobs. A job done by two people counts for both, with its price split evenly.</CardDescription>
              </CardHeader>
              <CardContent>
                {r.by_employee.length ? (
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground"><tr><th className="pb-2 font-medium">Person</th><th className="pb-2 text-right font-medium">Jobs</th><th className="pb-2 text-right font-medium">Job value</th></tr></thead>
                    <tbody>{r.by_employee.map((e) => (
                      <tr key={e.user_id ?? "none"} className="border-t border-border"><td className="py-2">{e.name}</td><td className="py-2 text-right tabular-nums">{e.jobs}</td><td className="py-2 text-right tabular-nums">{formatMoney(e.value_cents)}</td></tr>
                    ))}</tbody>
                  </table>
                ) : <p className="text-sm text-muted-foreground">No completed jobs in this period.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Top customers</CardTitle></CardHeader>
              <CardContent>
                {r.top_customers.length ? (
                  <ol className="divide-y divide-border text-sm">
                    {r.top_customers.map((c) => (
                      <li key={c.id} className="flex justify-between gap-3 py-2">
                        <Link href={`/provider/customers/${c.id}`} className="hover:text-primary">{c.name}</Link>
                        <span className="tabular-nums">{formatMoney(c.cents)}</span>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-muted-foreground">No payments in this period.</p>}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Unpaid invoices by age</CardTitle>
              <CardDescription>As of today, counted from each invoice&apos;s due date (or issue date if it has none).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {aging.map((x) => (
                  <div key={x.label} className="rounded-lg border border-border p-3">
                    <dt className="text-sm text-muted-foreground">{x.label}</dt>
                    <dd className={cn("text-lg font-semibold tabular-nums", x.cents ? x.tone : "")}>{formatMoney(x.cents)}</dd>
                    <dd className="text-xs text-muted-foreground">{x.count} {x.count === 1 ? "invoice" : "invoices"}</dd>
                  </div>
                ))}
              </dl>
              {r.overdue.length ? (
                <ul className="divide-y divide-border text-sm">
                  {r.overdue.map((i) => (
                    <li key={i.id}><Link href={`/provider/invoices/${i.id}`} className="flex justify-between gap-3 py-2 hover:text-primary">
                      <span>#{i.number} · {i.customer}</span>
                      <span className="tabular-nums">{formatMoney(i.balance_cents)} · {i.days_late} {i.days_late === 1 ? "day" : "days"} late</span>
                    </Link></li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
