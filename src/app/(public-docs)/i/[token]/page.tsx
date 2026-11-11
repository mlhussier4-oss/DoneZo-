import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocumentView, type DocumentViewData } from "@/components/crm/document-view";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createPublicClient } from "@/lib/supabase/public";
import { formatMoney } from "@/lib/format";
import { connection } from "next/server";
import { Alert } from "@/components/ui/alert";
import { PayByCardButton } from "@/components/payments/pay-by-card-button";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

async function InvoiceContent({ params, searchParams }: { params: PageProps<"/i/[token]">["params"]; searchParams: PageProps<"/i/[token]">["searchParams"] }) {
  await connection();
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) notFound();
  const { data } = await createPublicClient().rpc("get_public_invoice", { p_token: token });
  if (!data) notFound();
  const doc = data as unknown as DocumentViewData & { status: string };
  const { payment } = await searchParams;
  // Only whether this business takes cards right now; no other details leave the server.
  const { data: payInfo } = await createServiceClient().rpc("invoice_for_payment", { p_token: token });
  const balance = doc.total_cents - (doc.amount_paid_cents ?? 0);
  const canPayByCard = payInfo?.[0]?.stripe_status === "active" && ["sent", "partially_paid"].includes(doc.status) && balance > 0;
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Invoice from {doc.business.name}</h1>
        {doc.status === "paid" ? <Badge tone="success">Paid</Badge> : doc.status === "void" ? <Badge tone="danger">Void</Badge> : doc.status === "refunded" ? <Badge>Refunded</Badge> : <Badge tone="warning">{formatMoney(balance)} due</Badge>}
      </div>
      {payment === "submitted" && doc.status !== "paid" ? (
        <Alert tone="info" className="mb-4">Thanks! We&apos;re confirming your payment with Stripe. This page will show &ldquo;Paid&rdquo; once it&apos;s confirmed, usually within a minute.</Alert>
      ) : null}
      {canPayByCard ? <div className="mb-4"><PayByCardButton token={token} amountLabel={formatMoney(balance)} /></div> : null}
      <Card>
        <CardContent>
          <DocumentView doc={{ ...doc, kind: "invoice" }} />
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Questions? Contact {doc.business.name}{doc.business.phone ? ` at ${doc.business.phone}` : ""}.
      </p>
    </>
  );
}

export default function PublicInvoicePage({ params, searchParams }: PageProps<"/i/[token]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <InvoiceContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
