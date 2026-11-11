import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requirePro } from "@/lib/auth";
import { frequencyLabels } from "@/lib/crm/labels";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Recurring services" };

export default async function RecurringPage() {
  const { business } = await requirePro();
  const supabase = await createClient();
  const { data: schedules } = await supabase
    .from("recurring_schedules")
    .select("id, title, frequency, interval_days, price_cents, status, start_time, crm_customers(full_name)")
    .eq("business_id", business.id)
    .order("status")
    .order("title");

  return (
    <>
      <PageHeader
        title="Recurring services"
        description="Repeat work that fills your calendar automatically."
        actions={<Link href="/provider/recurring/new" className={buttonVariants()}><Plus /> New recurring service</Link>}
      />
      {!schedules?.length ? (
        <EmptyState icon={Repeat} title="No recurring services yet">
          Set one up from a customer&apos;s page, e.g. lawn mowing every Tuesday at 9am.
        </EmptyState>
      ) : (
        <Card className="divide-y divide-border">
          {schedules.map((s) => (
            <Link key={s.id} href={`/provider/recurring/${s.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">
                  {s.crm_customers?.full_name} · {s.frequency === "custom" ? `Every ${s.interval_days} days` : frequencyLabels[s.frequency]}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span>{formatMoney(s.price_cents)}</span>
                <Badge tone={s.status === "active" ? "success" : s.status === "paused" ? "warning" : "danger"} className="capitalize">{s.status}</Badge>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
