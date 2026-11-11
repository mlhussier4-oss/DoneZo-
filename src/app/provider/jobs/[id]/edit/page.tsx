import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePro } from "@/lib/auth";
import { getCategoryOptions, getCustomerOptions } from "@/lib/crm/queries";
import { uuid } from "@/lib/crm/schemas";
import { centsToInput, toLocalInputs } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { updateJob } from "../../actions";
import { JobForm } from "../../job-form";

export const metadata: Metadata = { title: "Edit job" };

export default async function EditJobPage({ params }: PageProps<"/provider/jobs/[id]/edit">) {
  const { business } = await requirePro();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", id).single();
  if (!job) notFound();
  const [customers, categories] = await Promise.all([getCustomerOptions(business.id), getCategoryOptions()]);
  const { date, time } = toLocalInputs(job.scheduled_start, business.timezone);
  const duration =
    job.scheduled_start && job.scheduled_end
      ? Math.round((new Date(job.scheduled_end).getTime() - new Date(job.scheduled_start).getTime()) / 60000)
      : 60;

  return (
    <>
      <PageHeader title="Edit job" />
      {job.source === "marketplace" ? (
        <Alert tone="info" className="mb-4 max-w-3xl">
          This is a marketplace job, so its price is the one the customer accepted. To change it, propose a change order from the booking.
        </Alert>
      ) : null}
      {job.recurring_schedule_id ? (
        <Alert tone="info" className="mb-4 max-w-3xl">
          This visit is part of a recurring service. Changes here apply to this visit only, and it won&apos;t be changed by later edits to the recurring service.
        </Alert>
      ) : null}
      <Card className="max-w-3xl">
        <CardContent>
          <JobForm
            action={updateJob.bind(null, job.id)}
            customers={customers}
            categories={categories}
            lockCustomer
            lockPrice={job.source === "marketplace"}
            submitLabel="Save changes"
            defaults={{
              customerId: job.customer_id,
              addressId: job.address_id,
              categoryId: job.category_id,
              title: job.title,
              description: job.description,
              price: centsToInput(job.price_cents),
              date,
              time,
              durationMinutes: Math.max(5, duration),
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
