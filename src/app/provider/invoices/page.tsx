import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Invoices" };

export default function ProviderInvoicesPage() {
  return (
    <>
      <PageHeader title="Invoices" />
      <ComingSoon title="Estimates and invoices" phase="Phase 2 (CRM)" />
    </>
  );
}
