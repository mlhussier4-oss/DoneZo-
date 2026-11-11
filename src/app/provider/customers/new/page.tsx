import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { NewCustomerForm } from "../customer-forms";

export const metadata: Metadata = { title: "Add customer" };

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader title="Add customer" description="Add a customer you already work with. They won't be contacted." />
      <Card className="max-w-3xl">
        <CardContent>
          <NewCustomerForm />
        </CardContent>
      </Card>
    </>
  );
}
