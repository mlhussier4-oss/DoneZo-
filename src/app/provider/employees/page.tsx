import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Employees" };

export default function ProviderEmployeesPage() {
  return (
    <>
      <PageHeader title="Employees" />
      <ComingSoon title="Employee accounts and assignments" phase="Phase 5 (Advanced)" />
    </>
  );
}
