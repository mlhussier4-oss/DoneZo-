import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Jobs" };

export default function ProviderJobsPage() {
  return (
    <>
      <PageHeader title="Jobs" />
      <ComingSoon title="Job management" phase="Phase 2 (CRM)" />
    </>
  );
}
