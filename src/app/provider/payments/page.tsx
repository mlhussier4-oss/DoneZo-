import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Payments" };

export default function ProviderPaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" />
      <ComingSoon title="Card payments and payment records" phase="Phase 4 (Payments)" />
    </>
  );
}
