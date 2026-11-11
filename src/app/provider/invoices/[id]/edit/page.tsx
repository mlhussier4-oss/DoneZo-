import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DocumentEditor } from "@/components/crm/document-editor";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePro } from "@/lib/auth";
import { getCustomerOptions } from "@/lib/crm/queries";
import { uuid } from "@/lib/crm/schemas";
import { bpsToPercent, centsToInput } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { saveDocument } from "../../actions";

export const metadata: Metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({ params }: PageProps<"/provider/invoices/[id]/edit">) {
  const { business } = await requirePro();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: inv } = await supabase.from("invoices").select("*, invoice_line_items(*)").eq("id", id).single();
  if (!inv) notFound();
  if (inv.status !== "draft" && inv.status !== "sent") redirect(`/provider/invoices/${id}`);
  const customers = await getCustomerOptions(business.id);
  return (
    <>
      <PageHeader title={`Edit invoice #${inv.number}`} />
      <Card>
        <CardContent>
          <DocumentEditor
            kind="invoice"
            action={saveDocument.bind(null, inv.id)}
            customers={customers}
            lockCustomer
            submitLabel="Save changes"
            defaults={{
              customerId: inv.customer_id,
              jobId: inv.job_id,
              issueDate: inv.issue_date,
              dueDate: inv.due_date,
              taxPercent: bpsToPercent(inv.tax_rate_bps),
              notes: inv.notes,
              lines: [...inv.invoice_line_items].sort((a, b) => a.position - b.position).map((l) => ({
                description: l.description, quantity: String(Number(l.quantity)), unitPrice: centsToInput(l.unit_price_cents), taxable: l.taxable,
              })),
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
