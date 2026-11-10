import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentView } from "@/components/crm/document-view";
import { ShareLink } from "@/components/crm/share-link";
import { EstimateStatusBadge } from "@/components/crm/status-badges";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProvider } from "@/lib/auth";
import { uuid } from "@/lib/crm/schemas";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { EstimateButtons } from "./estimate-actions";

export const metadata: Metadata = { title: "Estimate" };

export default async function EstimatePage({ params }: PageProps<"/provider/estimates/[id]">) {
  const { business } = await requireProvider();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: est } = await supabase
    .from("estimates")
    .select("*, crm_customers(id, full_name), estimate_line_items(description, quantity, unit_price_cents, amount_cents, position)")
    .eq("id", id)
    .single();
  if (!est) notFound();
  const { data: invoice } = await supabase.from("invoices").select("id, number").eq("estimate_id", id).maybeSingle();
  const editable = est.status === "draft" || est.status === "sent";

  return (
    <>
      <div className="mb-6 space-y-2">
        <Link href="/provider/invoices?tab=estimates" className="text-sm text-muted-foreground hover:text-foreground">← Estimates</Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Estimate #{est.number}</h1>
            <EstimateStatusBadge status={est.status} />
          </div>
          {editable ? <Link href={`/provider/estimates/${est.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>Edit</Link> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/provider/customers/${est.crm_customers?.id}`} className="text-primary hover:underline">{est.crm_customers?.full_name}</Link>
          {invoice ? <> · Became <Link href={`/provider/invoices/${invoice.id}`} className="text-primary hover:underline">invoice #{invoice.number}</Link></> : null}
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardContent>
            <DocumentView
              doc={{
                kind: "estimate",
                number: est.number,
                issue_date: est.issue_date,
                valid_until: est.valid_until,
                notes: est.notes,
                subtotal_cents: est.subtotal_cents,
                tax_rate_bps: est.tax_rate_bps,
                tax_cents: est.tax_cents,
                total_cents: est.total_cents,
                business: { name: business.name, email: business.email, phone: business.phone },
                customer_name: est.crm_customers?.full_name ?? "",
                line_items: [...est.estimate_line_items].sort((a, b) => a.position - b.position).map((l) => ({ ...l, amount_cents: l.amount_cents ?? 0 })),
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Next steps</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {est.status !== "draft" ? <ShareLink url={siteUrl(`/e/${est.public_token}`).toString()} label="Customer link" /> : (
              <p className="text-sm text-muted-foreground">Mark it as sent to get a private link for your customer.</p>
            )}
            <EstimateButtons estimateId={est.id} status={est.status} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
