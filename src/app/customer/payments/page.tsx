import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { InvoiceStatusBadge } from "@/components/crm/status-badges";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payments" };

export default async function CustomerPaymentsPage() {
  await requireRole("customer");
  const { data: invoices } = await (await createClient()).rpc("customer_invoices");
  return (
    <>
      <PageHeader title="Payments" description="Invoices from providers you've hired. Paying by card online is coming soon; for now, pay your provider directly." />
      {!invoices?.length ? <EmptyState icon={Receipt} title="No invoices yet">Your provider sends an invoice after the job is done.</EmptyState> : (
        <Card className="divide-y divide-border">
          {invoices.map((i) => (
            <Link key={i.token} href={`/i/${i.token}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="font-medium">{i.business_name} · Invoice #{i.number}</p>
                <p className="text-sm text-muted-foreground">{formatDate(i.issue_date)}{i.due_date ? ` · due ${formatDate(i.due_date)}` : ""}</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="tabular-nums">{formatMoney(i.total_cents)}</span>
                <InvoiceStatusBadge status={i.status} />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
