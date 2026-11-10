import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireProvider } from "@/lib/auth";
import { BusinessDetailsForm, MarketplaceToggle } from "./settings-forms";

export const metadata: Metadata = { title: "Business settings" };

export default async function ProviderSettingsPage() {
  const { business } = await requireProvider();
  const canManage = business.memberRole !== "employee";

  return (
    <>
      <PageHeader title="Business settings" />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Business details</CardTitle>
          </CardHeader>
          <CardContent>
            <BusinessDetailsForm business={business} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle>Marketplace access</CardTitle>
              {business.marketplaceEnabled ? <Badge tone="success">On</Badge> : <Badge>Off</Badge>}
            </div>
            <CardDescription>
              {business.marketplaceEnabled
                ? "You can browse local job requests and send bids. Turning this off hides the marketplace; your customers, jobs and invoices stay exactly as they are."
                : "Turn this on to get a public profile, see local job requests and send bids. It's the same account, and nothing is moved or copied."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManage ? (
              <MarketplaceToggle enabled={business.marketplaceEnabled} />
            ) : (
              <p className="text-sm text-muted-foreground">Only the owner or a manager can change this.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
            <CardDescription>
              You&apos;re on the free beta plan with every feature included. Subscription pricing hasn&apos;t been set yet.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </>
  );
}
