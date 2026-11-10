import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireProvider } from "@/lib/auth";
import { getCategoryOptions, getCustomerOptions } from "@/lib/crm/queries";
import { createJob } from "../actions";
import { JobForm } from "../job-form";

export const metadata: Metadata = { title: "New job" };

export default async function NewJobPage({ searchParams }: PageProps<"/provider/jobs/new">) {
  const { business } = await requireProvider();
  const params = await searchParams;
  const [customers, categories] = await Promise.all([getCustomerOptions(business.id), getCategoryOptions()]);
  const customerId = typeof params.customer === "string" && customers.some((c) => c.id === params.customer) ? params.customer : undefined;
  const date = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : undefined;

  return (
    <>
      <PageHeader title="New job" description="A one-time visit. For repeat work, set up a recurring service instead." />
      <Card className="max-w-3xl">
        <CardContent>
          <JobForm action={createJob} customers={customers} categories={categories} defaults={{ customerId, date }} submitLabel="Create job" />
        </CardContent>
      </Card>
    </>
  );
}
