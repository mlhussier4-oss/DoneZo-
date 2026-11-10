import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Customers" };

export default function ProviderCustomersPage() {
  return (
    <>
      <PageHeader title="Customers" />
      <ComingSoon title="Customer database" phase="Phase 2 (CRM)" />
    </>
  );
}
