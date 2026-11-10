import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ComingSoon } from "@/components/ui/coming-soon";
import { PageHeader } from "@/components/ui/page-header";
import { requireProvider } from "@/lib/auth";

export const metadata: Metadata = { title: "Marketplace" };

export default async function ProviderMarketplacePage() {
  const { business } = await requireProvider();
  // Server-side guard: CRM-only providers cannot reach marketplace pages even by typing the URL.
  if (!business.marketplaceEnabled) redirect("/provider/settings?marketplace=off");

  return (
    <>
      <PageHeader title="Marketplace" description="Local job requests in your service area." />
      <ComingSoon title="Job board, bids and marketplace profile" phase="Phase 3 (Marketplace)" />
    </>
  );
}
