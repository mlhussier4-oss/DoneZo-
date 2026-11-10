import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "My requests" };

export default function CustomerMyrequestsPage() {
  return (
    <>
      <PageHeader title="My requests" />
      <ComingSoon title="Open requests, bids received and bookings" phase="Phase 3 (Marketplace)" />
    </>
  );
}
