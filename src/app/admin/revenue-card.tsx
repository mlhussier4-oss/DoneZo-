import Link from "next/link";
import { ColumnChart } from "@/components/charts/column-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const REVENUE_RANGES = [
  { value: "today", label: "Today", note: "Today, by hour (Central time)" },
  { value: "7d", label: "7 days", note: "Last 7 days, by day" },
  { value: "30d", label: "30 days", note: "Last 30 days, by day" },
  { value: "year", label: "Year", note: "Last 12 months, by month" },
] as const;
export type RevenueRange = (typeof REVENUE_RANGES)[number]["value"];
export const isRevenueRange = (v: unknown): v is RevenueRange => REVENUE_RANGES.some((r) => r.value === v);

type Revenue = {
  range: RevenueRange; subs_cents: number; payments: number; fees_cents: number;
  buckets: { label: string; start: string; subs_cents: number; payments: number; fees_cents: number }[];
  recent: { paid_at: string; business: string; plan: string; amount_cents: number; refunded_cents: number }[];
};

const TZ = "America/Chicago";
const tick = (dollars: number) => (dollars >= 1000 ? `$${(dollars / 1000).toFixed(dollars % 1000 ? 1 : 0)}k` : `$${Math.round(dollars)}`);

/** Which columns get a label under the chart, so labels never crowd each other. */
function axisLabel(range: RevenueRange, label: string, i: number, n: number): string {
  if (range === "today") return i % 3 === 0 ? label : "";
  if (range === "30d") return i % 5 === 4 || i === n - 1 ? label : "";
  // Year: every other month (always including this month), so 12 names never run together on a phone.
  if (range === "year") return (n - 1 - i) % 2 === 0 ? label.slice(0, 3) : "";
  return label.slice(0, 3); // "Mon", "Tue" …
}

/**
 * Revenue box (owner request 2026-11-22): subscription income each time a provider pays, refreshed with the
 * dashboard every 15 seconds. Subscriptions are Stripe-confirmed payments net of refunds; card fees (HomeHire's
 * 10%) are shown alongside as a number, not stacked, so the chart stays one clear series.
 */
export async function RevenueCard({ range }: { range: RevenueRange }) {
  const { data, error } = await (await createClient()).rpc("admin_revenue", { p_range: range });
  if (error || !data) throw new Error("Could not load revenue.");
  const r = data as unknown as Revenue;
  const note = REVENUE_RANGES.find((x) => x.value === range)!.note;
  const chart = r.buckets.map((b, i) => ({
    key: b.start,
    label: `${b.label}: ${b.payments} ${b.payments === 1 ? "payment" : "payments"}`,
    value: b.subs_cents / 100,
    display: formatMoney(b.subs_cents),
    axisLabel: axisLabel(range, b.label, i, r.buckets.length),
  }));

  return (
    <Card className="mt-4" data-testid="revenue-card">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Subscription revenue</CardTitle>
            <CardDescription>{note}. Updates by itself whenever a provider pays.</CardDescription>
          </div>
          <nav aria-label="Revenue period" className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
            {REVENUE_RANGES.map((x) => (
              <Link key={x.value} href={`/admin?rev=${x.value}`} scroll={false} aria-current={x.value === range ? "page" : undefined}
                className={cn("rounded-md px-3 py-1.5 font-medium", x.value === range ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {x.label}
              </Link>
            ))}
          </nav>
        </div>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Subscriptions</dt>
            <dd className="text-2xl font-bold text-primary tabular-nums sm:text-3xl" data-testid="revenue-subs">{formatMoney(r.subs_cents)}</dd>
            <dd className="text-xs text-muted-foreground">{r.payments} {r.payments === 1 ? "payment" : "payments"}, after refunds</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Your 10% card fees</dt>
            <dd className="text-2xl font-bold tabular-nums sm:text-3xl">{formatMoney(r.fees_cents)}</dd>
            <dd className="text-xs text-muted-foreground">from card payments to pros</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Total income</dt>
            <dd className="text-2xl font-bold tabular-nums sm:text-3xl">{formatMoney(r.subs_cents + r.fees_cents)}</dd>
            <dd className="text-xs text-muted-foreground">before Stripe&apos;s processing fees</dd>
          </div>
        </dl>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <ColumnChart data={chart} formatTick={tick} ariaLabel={`Subscription revenue, ${note.toLowerCase()}`} />
        <div>
          <p className="mb-2 text-sm font-semibold">Latest subscription payments</p>
          <ul className="divide-y divide-border text-sm" data-testid="revenue-recent">
            {r.recent.map((p, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.business}</span>
                  <span className="text-xs text-muted-foreground">{p.plan} · {formatDateTime(p.paid_at, TZ)}</span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  {formatMoney(p.amount_cents)}
                  {p.refunded_cents ? <span className="block text-xs text-muted-foreground">{formatMoney(p.refunded_cents)} refunded</span> : null}
                </span>
              </li>
            ))}
            {!r.recent.length ? <li className="py-2 text-muted-foreground">No subscription payments yet. They&apos;ll appear here the moment Stripe confirms one.</li> : null}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
