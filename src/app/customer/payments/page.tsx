import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Payments" };

export default function CustomerPaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" />
      <ComingSoon title="Invoices and payment history" phase="Phase 4 (Payments)" />
    </>
  );
}
