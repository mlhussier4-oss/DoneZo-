import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Wallet } from "lucide-react";
import { VerificationBadge } from "@/components/crm/status-badges";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireProvider } from "@/lib/auth";
import { paymentMethodLabel } from "@/lib/crm/labels";
import { formatDate, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const { business } = await requireProvider();
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payment_records")
    .select("id, amount_cents, method, verification, received_on, note, invoice_id, invoices(number), crm_customers(id, full_name)")
    .eq("business_id", business.id)
    .order("received_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <>
      <PageHeader title="Payments" description="Every payment you've received, newest first." />

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CreditCard className="size-5 text-primary" aria-hidden />
            <CardTitle className="text-base">Card payments (Stripe)</CardTitle>
            <Badge>Not connected</Badge>
          </div>
          <CardDescription>
            Connecting Stripe to take card payments comes in the Payments phase. Until then you can record cash, Venmo, Cash App and
            check payments on any invoice.
          </CardDescription>
        </CardHeader>
      </Card>

      {!payments?.length ? (
        <EmptyState icon={Wallet} title="No payments yet">
          Record a payment from an invoice when a customer pays you.
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Confirmation</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.received_on)}</td>
                  <td className="px-4 py-3"><Link href={`/provider/customers/${p.crm_customers?.id}`} className="hover:text-primary">{p.crm_customers?.full_name}</Link></td>
                  <td className="px-4 py-3">{p.invoice_id ? <Link href={`/provider/invoices/${p.invoice_id}`} className="text-primary hover:underline">#{p.invoices?.number}</Link> : "—"}</td>
                  <td className="px-4 py-3">{paymentMethodLabel(p.method)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(p.amount_cents)}</td>
                  <td className="px-4 py-3"><VerificationBadge verification={p.verification} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
