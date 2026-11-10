import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Calendar" };

export default function ProviderCalendarPage() {
  return (
    <>
      <PageHeader title="Calendar" />
      <ComingSoon title="Calendar and recurring appointments" phase="Phase 2 (CRM)" />
    </>
  );
}
