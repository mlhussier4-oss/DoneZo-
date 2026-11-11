import type { Metadata } from "next";
import { StatTile } from "@/components/charts/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { formatDateTime, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Marketplace activity" };

export default async function AdminMarketplacePage() {
  await requireRole("admin");
  const supabase = await createClient();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [open, booked, bids, active, completed, { data: requests }, { data: bookings }] = await Promise.all([
    count(supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "open")),
    count(supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "booked")),
    count(supabase.from("bids").select("id", { count: "exact", head: true })),
    count(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "active")),
    count(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed")),
    supabase.from("service_requests").select("id, status, zip, timing, created_at, service_categories(name), bids(id)").order("created_at", { ascending: false }).limit(50),
    supabase.from("bookings").select("id, status, agreed_price_cents, created_at, businesses(name)").order("created_at", { ascending: false }).limit(50),
  ]);
  return (
    <>
      <PageHeader title="Marketplace activity" description="Customer addresses and messages stay private and aren't shown here." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="Open requests" value={String(open)} />
        <StatTile label="Booked requests" value={String(booked)} />
        <StatTile label="Bids sent" value={String(bids)} />
        <StatTile label="Active bookings" value={String(active)} />
        <StatTile label="Completed" value={String(completed)} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="overflow-x-auto">
          <CardHeader><CardTitle>Recent requests</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground"><tr><th className="py-2 font-medium">Service</th><th className="py-2 font-medium">ZIP</th><th className="py-2 font-medium">Bids</th><th className="py-2 font-medium">Status</th><th className="py-2 font-medium">Posted</th></tr></thead>
              <tbody>
                {(requests ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2">{r.service_categories?.name}</td><td className="py-2">{r.zip}</td><td className="py-2">{r.bids.length}</td>
                    <td className="py-2"><Badge className="capitalize">{r.status}</Badge></td><td className="py-2 whitespace-nowrap">{formatDateTime(r.created_at, "America/Chicago")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card className="overflow-x-auto">
          <CardHeader><CardTitle>Recent bookings</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground"><tr><th className="py-2 font-medium">Provider</th><th className="py-2 text-right font-medium">Price</th><th className="py-2 font-medium">Status</th><th className="py-2 font-medium">Booked</th></tr></thead>
              <tbody>
                {(bookings ?? []).map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="py-2">{b.businesses?.name}</td><td className="py-2 text-right tabular-nums">{formatMoney(b.agreed_price_cents)}</td>
                    <td className="py-2"><Badge className="capitalize">{b.status}</Badge></td><td className="py-2 whitespace-nowrap">{formatDateTime(b.created_at, "America/Chicago")}</td>
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
