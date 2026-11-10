import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverviewPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const [customers, providers, businesses, marketplace, suspended] = await Promise.all([
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer")),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "provider")),
    count(supabase.from("businesses").select("id", { count: "exact", head: true })),
    count(supabase.from("businesses").select("id", { count: "exact", head: true }).eq("marketplace_enabled", true)),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_suspended", true)),
  ]);

  const stats = [
    { label: "Customers", value: customers },
    { label: "Providers", value: providers },
    { label: "Businesses", value: businesses },
    { label: "Marketplace on", value: marketplace },
    { label: "Suspended users", value: suspended },
  ];

  return (
    <>
      <PageHeader title="Platform overview" description="Live counts from the database." />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Jobs, bids, bookings, payments and complaints will be added here as those features are built.
      </p>
    </>
  );
}
