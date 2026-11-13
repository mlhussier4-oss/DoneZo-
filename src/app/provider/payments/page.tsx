import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, ExternalLink, Wallet } from "lucide-react";
import { VerificationBadge } from "@/components/crm/status-badges";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireManager } from "@/lib/auth";
import { paymentMethodLabel } from "@/lib/crm/labels";
import { formatDate, formatMoney } from "@/lib/format";
import { formatFeePercent } from "@/lib/payments/fees";
import { accountStatusLabel, type StripeAccountStatus } from "@/lib/stripe/account-status";
import { recentPayouts, refreshAccountStatus } from "@/lib/stripe/connect";
import { createClient } from "@/lib/supabase/server";
import { CheckStatusButton, ConnectStripeButton, RefundButton } from "./payment-buttons";

export const metadata: Metadata = { title: "Payments" };

const payoutStatus: Record<string, string> = {
  paid: "Deposited", pending: "Pending", in_transit: "On its way", canceled: "Canceled", failed: "Failed",
};

export default async function PaymentsPage({ searchParams }: PageProps<"/provider/payments">) {
  const { business } = await requireManager();
  const params = await searchParams;
  const supabase = await createClient();
  // Returning from Stripe onboarding, or still waiting on Stripe: read the account from Stripe's API.
  const { data: current } = await supabase.from("stripe_accounts").select("status").eq("business_id", business.id).maybeSingle();
  if (params.stripe === "returned" || (current && current.status !== "active")) {
    try { await refreshAccountStatus(business.id); } catch (err) { console.error(err); }
  }
  const [{ data: acct }, { data: settings }, { data: payments }] = await Promise.all([
    supabase.from("stripe_accounts").select("stripe_account_id, status, requirements_due, payouts_enabled").eq("business_id", business.id).maybeSingle(),
    supabase.from("platform_settings").select("card_fee_bps").single(),
    supabase
      .from("payment_records")
      .select("id, amount_cents, method, verification, received_on, application_fee_cents, refunded_cents, invoice_id, invoices(number), crm_customers(id, full_name)")
      .eq("business_id", business.id)
      .order("received_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(300),
  ]);
  const status = (acct?.status ?? "not_connected") as StripeAccountStatus | "not_connected";
  const s = accountStatusLabel[status];
  let payouts: Awaited<ReturnType<typeof recentPayouts>> = [];
  if (acct && status === "active") {
    try { payouts = await recentPayouts(acct.stripe_account_id); } catch (err) { console.error(err); }
  }
  const fee = formatFeePercent(settings?.card_fee_bps ?? 1000);

  return (
    <>
      <PageHeader title="Payments" description="Every payment you've received, newest first." />
      {params.stripe === "error" ? <Alert tone="error" className="mb-4">We couldn&apos;t reach Stripe. Please try again.</Alert> : null}

      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CreditCard className="size-5 text-primary" aria-hidden />
              <CardTitle className="text-base">Card payments (Stripe)</CardTitle>
              <Badge tone={s.tone}>{s.label}</Badge>
            </div>
            <CardDescription>{s.help}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {status === "not_connected" ? (
              <>
                <p>Customers pay your invoices by card on a secure Stripe page, and the money goes to your own Stripe account. HomeHire&apos;s fee is {fee} of each card payment; Stripe&apos;s processing fee is charged by Stripe. No fee on cash, Venmo or Cash App.</p>
                <ConnectStripeButton label="Connect Stripe" />
              </>
            ) : status !== "active" ? (
              <>
                {acct?.requirements_due?.length ? <p className="text-muted-foreground">Stripe still needs {acct.requirements_due.length} {acct.requirements_due.length === 1 ? "item" : "items"} from you.</p> : null}
                <div className="flex flex-wrap items-center gap-2">
                  <ConnectStripeButton label={status === "onboarding_incomplete" ? "Continue Stripe setup" : "Update details on Stripe"} />
                  <CheckStatusButton />
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p>Card payments are on. Customers see a &ldquo;Pay by card&rdquo; button on your invoices.</p>
                <a href="https://dashboard.stripe.com/" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">Stripe dashboard <ExternalLink className="size-3.5" aria-hidden /></a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payouts to your bank</CardTitle>
            <CardDescription>Stripe sends card payments to your bank on its own schedule. A paid invoice doesn&apos;t mean the money has reached your bank yet.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {payouts.length ? (
              <ul className="space-y-2">
                {payouts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span>{formatMoney(p.amount)} · {formatDate(new Date(p.arrival_date * 1000))}</span>
                    <Badge tone={p.status === "paid" ? "success" : p.status === "failed" ? "danger" : "primary"}>{payoutStatus[p.status] ?? p.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : <p className="text-muted-foreground">{status === "active" ? "No payouts yet." : "Available once card payments are on."}</p>}
          </CardContent>
        </Card>
      </div>

      {!payments?.length ? (
        <EmptyState icon={Wallet} title="No payments yet">Record cash or Venmo on an invoice, or send a card payment link.</EmptyState>
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
                <th className="px-4 py-3 text-right font-medium">HomeHire fee</th>
                <th className="px-4 py-3 font-medium">Confirmation</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border align-top last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.received_on)}</td>
                  <td className="px-4 py-3"><Link href={`/provider/customers/${p.crm_customers?.id}`} className="hover:text-primary">{p.crm_customers?.full_name}</Link></td>
                  <td className="px-4 py-3">{p.invoice_id ? <Link href={`/provider/invoices/${p.invoice_id}`} className="text-primary hover:underline">#{p.invoices?.number}</Link> : "—"}</td>
                  <td className="px-4 py-3">{paymentMethodLabel(p.method)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMoney(p.amount_cents)}
                    {p.refunded_cents ? <span className="block text-xs text-destructive">−{formatMoney(p.refunded_cents)} refunded</span> : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.application_fee_cents ? formatMoney(p.application_fee_cents) : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <VerificationBadge verification={p.verification} />
                      {p.verification === "stripe_verified" && p.refunded_cents < p.amount_cents ? <RefundButton paymentId={p.id} amountLabel={formatMoney(p.amount_cents - p.refunded_cents)} /> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
