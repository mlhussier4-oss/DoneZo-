import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Messages" };

export default function CustomerMessagesPage() {
  return (
    <>
      <PageHeader title="Messages" />
      <ComingSoon title="Private messages with the provider you hire" phase="Phase 3 (Marketplace)" />
    </>
  );
}
