import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DocumentView } from "@/components/crm/document-view";
import { ShareLink } from "@/components/crm/share-link";
import { InvoiceStatusBadge, VerificationBadge } from "@/components/crm/status-badges";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireManager } from "@/lib/auth";
import { paymentMethodLabel } from "@/lib/crm/labels";
import { uuid } from "@/lib/crm/schemas";
import { siteUrl } from "@/lib/env";
import { formatDate, formatMoney, localDateKey } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { DeletePaymentButton, InvoiceButtons, RecordPaymentForm } from "./invoice-actions";
import { CreateCardLinkButton } from "./card-payment";
import { RefundButton } from "../../payments/payment-buttons";
import { cardPaymentLabel, cardPaymentState } from "@/lib/payments/invoice-payments";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: PageProps<"/provider/invoices/[id]">) {
  const { business } = await requireManager();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("*, crm_customers(id, full_name), invoice_line_items(description, quantity, unit_price_cents, amount_cents, position), jobs(id, title)")
    .eq("id", id)
    .single();
  if (!inv) notFound();
  // DoneZo Basic: only invoices for marketplace jobs.
  if (!business.hasCrm && inv.source !== "marketplace") redirect("/provider/plan?need=pro");
  const [{ data: payments }, { data: requests }, { data: acct }] = await Promise.all([
    supabase.from("payment_records")
      .select("id, amount_cents, method, verification, received_on, note, refunded_cents, application_fee_cents")
      .eq("invoice_id", id).order("received_on"),
    supabase.from("payment_requests").select("status, failure_message, created_at").eq("invoice_id", id).order("created_at", { ascending: false }),
    supabase.from("stripe_accounts").select("status").eq("business_id", business.id).maybeSingle(),
  ]);
  const cardState = cardPaymentState({ stripeActive: acct?.status === "active", invoiceStatus: inv.status, requests: requests ?? [] });

  const balance = inv.total_cents - inv.amount_paid_cents;
  const editable = (inv.status === "draft" || inv.status === "sent") && inv.source !== "marketplace";
  const lines = [...inv.invoice_line_items].sort((a, b) => a.position - b.position).map((l) => ({ ...l, amount_cents: l.amount_cents ?? 0 }));

  return (
    <>
      <div className="mb-6 space-y-2">
        <Link href="/provider/invoices" className="text-sm text-muted-foreground hover:text-foreground">← Invoices</Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Invoice #{inv.number}</h1>
            <InvoiceStatusBadge status={inv.status} />
            {inv.source === "marketplace" ? <Badge tone="accent">Marketplace</Badge> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {editable ? <Link href={`/provider/invoices/${inv.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>Edit</Link> : null}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/provider/customers/${inv.crm_customers?.id}`} className="text-primary hover:underline">{inv.crm_customers?.full_name}</Link>
          {inv.jobs ? <> · Job: <Link href={`/provider/jobs/${inv.jobs.id}`} className="text-primary hover:underline">{inv.jobs.title}</Link></> : null}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardContent>
            <DocumentView
              doc={{
                kind: "invoice",
                number: inv.number,
                issue_date: inv.issue_date,
                due_date: inv.due_date,
                notes: inv.notes,
                subtotal_cents: inv.subtotal_cents,
                tax_rate_bps: inv.tax_rate_bps,
                tax_cents: inv.tax_cents,
                total_cents: inv.total_cents,
                amount_paid_cents: inv.amount_paid_cents,
                business: { name: business.name, email: business.email, phone: business.phone },
                customer_name: inv.crm_customers?.full_name ?? "",
                line_items: lines,
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">{inv.status === "draft" ? "Ready to send?" : "Send to customer"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {inv.status === "draft" ? (
                <p className="text-sm text-muted-foreground">
                  Mark it as sent to get a private link for your customer. Emailing invoices automatically will be added when an email service is connected.
                </p>
              ) : inv.status !== "void" ? (
                <ShareLink url={siteUrl(`/i/${inv.public_token}`).toString()} label="Customer link" />
              ) : null}
              <InvoiceButtons invoiceId={inv.id} status={inv.status} hasPayments={(payments?.length ?? 0) > 0} />
              {inv.sent_at ? <p className="text-xs text-muted-foreground">Marked sent {formatDate(inv.sent_at, business.timezone)}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Card payment</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex flex-wrap items-center gap-2">Status: <Badge tone={cardState === "paid" ? "success" : cardState === "failed" ? "danger" : cardState === "link_sent" ? "warning" : "neutral"}>{cardPaymentLabel[cardState]}</Badge></p>
              {cardState === "failed" && requests?.[0]?.failure_message ? <p className="text-destructive">{requests[0].failure_message}</p> : null}
              {cardState === "unavailable" ? (
                <p className="text-muted-foreground">Connect Stripe on the <Link href="/provider/payments" className="text-primary hover:underline">Payments page</Link> so customers can pay by card.</p>
              ) : (inv.status === "sent" || inv.status === "partially_paid") && balance > 0 ? (
                <>
                  <p className="text-muted-foreground">Your customer link has a &ldquo;Pay by card&rdquo; button. Card payments are confirmed by Stripe, then marked paid here automatically.</p>
                  <CreateCardLinkButton invoiceId={inv.id} />
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {payments?.length ? (
                <ul className="space-y-2 text-sm">
                  {payments.map((p) => (
                    <li key={p.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{formatMoney(p.amount_cents)} · {paymentMethodLabel(p.method)}</span>
                        <VerificationBadge verification={p.verification} />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatDate(p.received_on)}{p.note ? ` · ${p.note}` : ""}{p.refunded_cents ? ` · ${formatMoney(p.refunded_cents)} refunded` : ""}</span>
                        {p.verification === "provider_recorded" ? <DeletePaymentButton paymentId={p.id} /> : p.refunded_cents < p.amount_cents ? <RefundButton paymentId={p.id} amountLabel={formatMoney(p.amount_cents - p.refunded_cents)} /> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No payments yet.</p>}
              {(inv.status === "sent" || inv.status === "partially_paid") && balance > 0 ? (
                <div className="border-t border-border pt-4">
                  <p className="mb-3 text-sm font-medium">Record a payment · {formatMoney(balance)} due</p>
                  <RecordPaymentForm invoiceId={inv.id} balanceCents={balance} today={localDateKey(new Date(), business.timezone)} />
                </div>
              ) : null}
              {inv.status === "draft" ? <p className="text-xs text-muted-foreground">Mark the invoice as sent before recording payments.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
