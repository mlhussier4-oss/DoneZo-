import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireProvider } from "@/lib/auth";
import { getCategoryOptions, getCustomerOptions } from "@/lib/crm/queries";
import { localDateKey } from "@/lib/format";
import { createSchedule } from "../actions";
import { ScheduleForm } from "../schedule-form";

export const metadata: Metadata = { title: "New recurring service" };

export default async function NewSchedulePage({ searchParams }: PageProps<"/provider/recurring/new">) {
  const { business } = await requireProvider();
  const params = await searchParams;
  const [customers, categories] = await Promise.all([getCustomerOptions(business.id), getCategoryOptions()]);
  const customerId = typeof params.customer === "string" && customers.some((c) => c.id === params.customer) ? params.customer : undefined;
  return (
    <>
      <PageHeader title="New recurring service" description="For repeat work, like mowing every Tuesday. Each visit appears on your calendar as its own job." />
      <Card className="max-w-3xl">
        <CardContent>
          <ScheduleForm
            action={createSchedule}
            customers={customers}
            categories={categories}
            defaults={{ customerId, startDate: localDateKey(new Date(), business.timezone) }}
            submitLabel="Create recurring service"
          />
        </CardContent>
      </Card>
    </>
  );
}
