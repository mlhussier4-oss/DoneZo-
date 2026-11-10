import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DocumentEditor } from "@/components/crm/document-editor";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireProvider } from "@/lib/auth";
import { getCustomerOptions } from "@/lib/crm/queries";
import { uuid } from "@/lib/crm/schemas";
import { bpsToPercent, centsToInput } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { saveDocument } from "../../../invoices/actions";

export const metadata: Metadata = { title: "Edit estimate" };

export default async function EditEstimatePage({ params }: PageProps<"/provider/estimates/[id]/edit">) {
  const { business } = await requireProvider();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: est } = await supabase.from("estimates").select("*, estimate_line_items(*)").eq("id", id).single();
  if (!est) notFound();
  if (est.status !== "draft" && est.status !== "sent") redirect(`/provider/estimates/${id}`);
  const customers = await getCustomerOptions(business.id);
  return (
    <>
      <PageHeader title={`Edit estimate #${est.number}`} />
      <Card>
        <CardContent>
          <DocumentEditor
            kind="estimate"
            action={saveDocument.bind(null, est.id)}
            customers={customers}
            lockCustomer
            submitLabel="Save changes"
            defaults={{
              customerId: est.customer_id,
              jobId: est.job_id,
              issueDate: est.issue_date,
              dueDate: est.valid_until,
              taxPercent: bpsToPercent(est.tax_rate_bps),
              notes: est.notes,
              lines: [...est.estimate_line_items].sort((a, b) => a.position - b.position).map((l) => ({
                description: l.description, quantity: String(Number(l.quantity)), unitPrice: centsToInput(l.unit_price_cents), taxable: l.taxable,
              })),
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
