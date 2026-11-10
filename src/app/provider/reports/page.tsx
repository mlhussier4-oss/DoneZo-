import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Reports" };

export default function ProviderReportsPage() {
  return (
    <>
      <PageHeader title="Reports" />
      <ComingSoon title="Revenue and business reports" phase="Phase 2 (CRM) and Phase 5 (Advanced)" />
    </>
  );
}
