import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireProvider } from "@/lib/auth";
import { uuid } from "@/lib/crm/schemas";
import { createClient } from "@/lib/supabase/server";
import { EditCustomerForm } from "../../customer-forms";

export const metadata: Metadata = { title: "Edit customer" };

export default async function EditCustomerPage({ params }: PageProps<"/provider/customers/[id]/edit">) {
  await requireProvider();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("crm_customers")
    .select("id, full_name, email, phone, service_preferences")
    .eq("id", id)
    .single();
  if (!c) notFound();
  return (
    <>
      <PageHeader title={`Edit ${c.full_name}`} />
      <Card className="max-w-3xl">
        <CardContent>
          <EditCustomerForm customerId={c.id} values={c} />
        </CardContent>
      </Card>
    </>
  );
}
