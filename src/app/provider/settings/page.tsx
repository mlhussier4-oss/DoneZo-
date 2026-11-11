import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireManager } from "@/lib/auth";
import { BusinessDetailsForm, MarketplaceToggle } from "./settings-forms";
import { ManageBillingButton } from "../../subscribe/subscribe-buttons";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Business settings" };

export default async function ProviderSettingsPage() {
  const { business } = await requireManager();
  const canManage = business.memberRole !== "employee";
  const { data: sub } = await (await createClient())
    .from("business_subscriptions")
    .select("status, current_period_end, cancel_at_period_end")
    .eq("business_id", business.id)
    .maybeSingle();

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
            <div className="flex items-center gap-3">
              <CardTitle>Subscription</CardTitle>
              <Badge tone={sub?.status === "past_due" ? "warning" : "success"}>{sub?.status === "past_due" ? "Payment overdue" : "Active"}</Badge>
            </div>
            <CardDescription>
              DoneZo Standard, $9.99/month.
              {sub?.current_period_end ? ` ${sub.cancel_at_period_end ? "Ends" : "Renews"} ${formatDate(sub.current_period_end)}.` : ""}
              {sub?.status === "past_due" ? " Stripe couldn't charge your card; update it to keep access." : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>{canManage ? <ManageBillingButton /> : <p className="text-sm text-muted-foreground">Only the owner can manage billing.</p>}</CardContent>
        </Card>
      </div>
    </>
  );
}
