import type { Metadata } from "next";
import { StatTile } from "@/components/charts/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { FeeForm } from "./fee-form";

export const metadata: Metadata = { title: "Payments" };

export default async function AdminPaymentsPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const [{ data: settings }, { data: subs }, { data: payments }] = await Promise.all([
    supabase.from("platform_settings").select("card_fee_bps, subscription_price_cents").single(),
    supabase.from("business_subscriptions").select("business_id, status, current_period_end, cancel_at_period_end, businesses(name)").order("updated_at", { ascending: false }),
    supabase.from("payment_records").select("id, business_id, amount_cents, application_fee_cents, refunded_cents, received_on")
      .eq("verification", "stripe_verified").order("created_at", { ascending: false }).limit(200),
  ]);
  const businessIds = [...new Set((payments ?? []).map((p) => p.business_id))];
  const { data: names } = businessIds.length ? await supabase.from("businesses").select("id, name").in("id", businessIds) : { data: [] };
  const nameOf = new Map((names ?? []).map((b) => [b.id, b.name]));
  const active = (subs ?? []).filter((s) => s.status === "active" || s.status === "past_due");
  // Stripe refunds DoneZo's fee in proportion to the amount refunded.
  const feesEarned = (payments ?? []).reduce((sum, p) => sum + Math.round(p.application_fee_cents * (1 - p.refunded_cents / p.amount_cents)), 0);
  const cardVolume = (payments ?? []).reduce((sum, p) => sum + p.amount_cents - p.refunded_cents, 0);

  return (
    <>
      <PageHeader title="Payments" description="Stripe test mode. Card payments go to each provider's own Stripe account; DoneZo receives its fee." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Active subscriptions" value={String(active.length)} context={`${formatMoney((settings?.subscription_price_cents ?? 999) * active.length)} / month`} />
        <StatTile label="Card volume" value={formatMoney(cardVolume)} context="after refunds, last 200 payments" />
        <StatTile label="DoneZo card fees" value={formatMoney(feesEarned)} context="after refunds" />
        <StatTile label="Card fee rate" value={`${(settings?.card_fee_bps ?? 1000) / 100}%`} />
      </div>
      <Card className="mt-6">
        <CardContent><FeeForm percent={(settings?.card_fee_bps ?? 1000) / 100} /></CardContent>
      </Card>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="overflow-x-auto">
          <CardHeader><CardTitle>Subscriptions</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground"><tr><th className="py-2 font-medium">Business</th><th className="py-2 font-medium">Status</th><th className="py-2 font-medium">Renews / ends</th></tr></thead>
              <tbody>
                {(subs ?? []).map((s) => (
                  <tr key={s.business_id} className="border-t border-border">
                    <td className="py-2">{s.businesses?.name}</td>
                    <td className="py-2"><Badge tone={s.status === "active" ? "success" : s.status === "past_due" ? "warning" : "neutral"}>{s.status ?? "not started"}</Badge></td>
                    <td className="py-2">{s.current_period_end ? `${s.cancel_at_period_end ? "Ends" : "Renews"} ${formatDate(s.current_period_end)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card className="overflow-x-auto">
          <CardHeader><CardTitle>Recent card payments</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground"><tr><th className="py-2 font-medium">Date</th><th className="py-2 font-medium">Provider</th><th className="py-2 text-right font-medium">Amount</th><th className="py-2 text-right font-medium">Fee</th><th className="py-2 text-right font-medium">Refunded</th></tr></thead>
              <tbody>
                {(payments ?? []).map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2 whitespace-nowrap">{formatDate(p.received_on)}</td><td className="py-2">{nameOf.get(p.business_id)}</td>
                    <td className="py-2 text-right tabular-nums">{formatMoney(p.amount_cents)}</td>
                    <td className="py-2 text-right tabular-nums">{formatMoney(p.application_fee_cents)}</td>
                    <td className="py-2 text-right tabular-nums">{p.refunded_cents ? formatMoney(p.refunded_cents) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
