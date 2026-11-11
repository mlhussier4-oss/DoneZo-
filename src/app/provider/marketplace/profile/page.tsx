import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ProviderAvatar } from "@/components/marketplace/provider-avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireManager } from "@/lib/auth";
import { getCategoryOptions } from "@/lib/crm/queries";
import { publicMediaUrl } from "@/lib/marketplace/queries";
import { createClient } from "@/lib/supabase/server";
import { DeletePortfolioButton, MarketplaceProfileForm, MediaUploader } from "./profile-forms";

export const metadata: Metadata = { title: "Marketplace profile" };

export default async function MarketplaceProfilePage() {
  const { business } = await requireManager();
  if (!business.marketplaceEnabled) redirect("/provider/settings?marketplace=off");
  const supabase = await createClient();
  const [{ data: b }, { data: cats }, { data: photos }, allCategories] = await Promise.all([
    supabase.from("businesses").select("home_zip, service_radius_miles, years_experience, description, accepted_payment_methods, logo_path, verified_at").eq("id", business.id).single(),
    supabase.from("provider_categories").select("category_id").eq("business_id", business.id),
    supabase.from("portfolio_photos").select("id, storage_path, caption").eq("business_id", business.id).order("created_at", { ascending: false }),
    getCategoryOptions(),
  ]);

  return (
    <>
      <PageHeader
        title="Marketplace profile"
        description="What customers see when you bid. Ratings and verification can't be bought: they come from real jobs and our checks."
        actions={<Link href={`/pros/${business.id}`} className={buttonVariants({ variant: "outline" })} target="_blank"><ExternalLink /> View public profile</Link>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader><CardTitle>Service area and services</CardTitle></CardHeader>
          <CardContent>
            <MarketplaceProfileForm
              allCategories={allCategories}
              values={{
                homeZip: b?.home_zip ?? "",
                radius: b?.service_radius_miles ?? 15,
                years: b?.years_experience ?? null,
                description: b?.description ?? "",
                categories: (cats ?? []).map((c) => c.category_id),
                methods: b?.accepted_payment_methods ?? [],
              }}
            />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Logo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <ProviderAvatar name={business.name} logoPath={b?.logo_path ?? null} size="lg" />
              <MediaUploader businessId={business.id} kind="logo" label={b?.logo_path ? "Replace logo" : "Upload logo"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verification</CardTitle>
              <CardDescription>
                {b?.verified_at ? <Badge tone="success">Verified</Badge> : "Not verified yet. DoneZo checks your business documents before showing a Verified badge. Contact support to start."}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Past work</CardTitle>
          <CardDescription>Photos of jobs you&apos;ve done. Customers see the three newest next to your bids.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MediaUploader businessId={business.id} kind="portfolio" label="Add photos" />
          {photos?.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((p) => (
                <li key={p.id} className="relative overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element -- public portfolio photo */}
                  <img src={publicMediaUrl(p.storage_path)!} alt={p.caption ?? "Portfolio photo"} className="aspect-square w-full object-cover" />
                  {p.caption ? <p className="truncate px-2 py-1 text-xs">{p.caption}</p> : null}
                  <DeletePortfolioButton photoId={p.id} />
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
