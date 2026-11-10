import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocumentView, type DocumentViewData } from "@/components/crm/document-view";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createPublicClient } from "@/lib/supabase/public";
import { formatMoney } from "@/lib/format";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

async function InvoiceContent({ params }: { params: PageProps<"/i/[token]">["params"] }) {
  await connection();
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) notFound();
  const { data } = await createPublicClient().rpc("get_public_invoice", { p_token: token });
  if (!data) notFound();
  const doc = data as unknown as DocumentViewData & { status: string };
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Invoice from {doc.business.name}</h1>
        {doc.status === "paid" ? <Badge tone="success">Paid</Badge> : doc.status === "void" ? <Badge tone="danger">Void</Badge> : <Badge tone="warning">{formatMoney(doc.total_cents - (doc.amount_paid_cents ?? 0))} due</Badge>}
      </div>
      <Card>
        <CardContent>
          <DocumentView doc={{ ...doc, kind: "invoice" }} />
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Questions or ready to pay? Contact {doc.business.name}{doc.business.phone ? ` at ${doc.business.phone}` : ""}. Online card payment is coming soon.
      </p>
    </>
  );
}

export default function PublicInvoicePage({ params }: PageProps<"/i/[token]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <InvoiceContent params={params} />
    </Suspense>
  );
}
