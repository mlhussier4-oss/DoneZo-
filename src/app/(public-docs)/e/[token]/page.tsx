import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocumentView, type DocumentViewData } from "@/components/crm/document-view";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createPublicClient } from "@/lib/supabase/public";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Estimate", robots: { index: false, follow: false } };

async function EstimateContent({ params }: { params: PageProps<"/e/[token]">["params"] }) {
  await connection();
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) notFound();
  const { data } = await createPublicClient().rpc("get_public_estimate", { p_token: token });
  if (!data) notFound();
  const doc = data as unknown as DocumentViewData & { status: string };
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Estimate from {doc.business.name}</h1>
        {doc.status === "accepted" || doc.status === "converted" ? <Badge tone="success">Accepted</Badge> : doc.status === "declined" ? <Badge tone="danger">Declined</Badge> : null}
      </div>
      <Card>
        <CardContent>
          <DocumentView doc={{ ...doc, kind: "estimate" }} />
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        To accept this estimate, contact {doc.business.name}{doc.business.phone ? ` at ${doc.business.phone}` : ""}.
      </p>
    </>
  );
}

export default function PublicEstimatePage({ params }: PageProps<"/e/[token]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <EstimateContent params={params} />
    </Suspense>
  );
}
