import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentEditor } from "@/components/crm/document-editor";
import { PageHeader } from "@/components/ui/page-header";
import { requireManager } from "@/lib/auth";
import { addDays } from "@/lib/dates";
import { getCustomerOptions } from "@/lib/crm/queries";
import { bpsToPercent, localDateKey } from "@/lib/format";
import { saveDocument } from "../actions";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewDocumentPage({ searchParams }: PageProps<"/provider/invoices/new">) {
  const { business } = await requireManager();
  const params = await searchParams;
  const kind = params.kind === "estimate" ? "estimate" : "invoice";
  const customers = await getCustomerOptions(business.id);
  const customerId = typeof params.customer === "string" && customers.some((c) => c.id === params.customer) ? params.customer : undefined;
  const today = localDateKey(new Date(), business.timezone);

  return (
    <>
      <PageHeader title={kind === "invoice" ? "New invoice" : "New estimate"} description="Saved as a draft. Nothing is sent until you choose to send it." />
      <Card>
        <CardContent>
          <DocumentEditor
            kind={kind}
            action={saveDocument.bind(null, null)}
            customers={customers}
            submitLabel={kind === "invoice" ? "Save invoice" : "Save estimate"}
            defaults={{
              customerId,
              issueDate: today,
              dueDate: addDays(today, kind === "invoice" ? 14 : 30),
              taxPercent: bpsToPercent(business.defaultTaxRateBps),
              lines: [],
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
