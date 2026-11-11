import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Check } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentBusiness, requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { confirmSubscriptionSession } from "@/lib/stripe/subscription";
import { createClient } from "@/lib/supabase/server";
import { ManageBillingButton, SubscribeButton } from "./subscribe-buttons";

export const metadata: Metadata = { title: "Subscribe" };

const included = [
  "Customer database, calendar and recurring visits",
  "Jobs, photos, estimates and invoices",
  "Card payments through Stripe and cash/Venmo/Cash App records",
  "Reports and revenue tracking",
  "Marketplace: local job requests and bidding (if you switch it on)",
];

async function SubscribeContent({ searchParams }: { searchParams: PageProps<"/subscribe">["searchParams"] }) {
  await requireRole("provider");
  const business = await getCurrentBusiness();
  if (!business) redirect("/login");
  const params = await searchParams;
  const supabase = await createClient();

  // Coming back from Stripe: confirm with Stripe's API, not the URL.
  if (typeof params.session_id === "string") {
    let confirmed = false;
    try {
      confirmed = await confirmSubscriptionSession(params.session_id, business.id);
    } catch (err) {
      console.error("confirm subscription failed", err);
    }
    if (confirmed) redirect("/provider?welcome=1");
  }

  const [{ data: access }, { data: sub }] = await Promise.all([
    supabase.rpc("business_has_access", { p_business_id: business.id }),
    supabase.from("business_subscriptions").select("status, current_period_end").eq("business_id", business.id).maybeSingle(),
  ]);
  if (access) redirect("/provider");
  const ended = sub?.status && ["canceled", "unpaid", "incomplete_expired"].includes(sub.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{ended ? "Your subscription has ended" : `Activate ${business.name}`}</CardTitle>
        <CardDescription>
          {ended
            ? `Subscribe again to get back to your customers, jobs and invoices. Nothing has been deleted.${sub?.current_period_end ? ` Access ended ${formatDate(sub.current_period_end)}.` : ""}`
            : "One plan with everything included. Cancel any time."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {params.canceled ? <Alert tone="info">Checkout was canceled. You haven&apos;t been charged.</Alert> : null}
        {typeof params.session_id === "string" ? <Alert tone="info">We&apos;re confirming your payment with Stripe. Refresh in a moment if this page doesn&apos;t update.</Alert> : null}
        <p><span className="text-4xl font-bold">$9.99</span><span className="text-muted-foreground"> / month</span></p>
        <ul className="space-y-2 text-sm">
          {included.map((i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{i}</li>)}
        </ul>
        <SubscribeButton label={ended ? "Resubscribe for $9.99/month" : "Subscribe for $9.99/month"} />
        <p className="text-xs text-muted-foreground">
          Payment is handled securely by Stripe; DoneZo never sees your card number. A 10% fee applies to card payments your customers make through DoneZo; there&apos;s no fee on cash, Venmo or Cash App.
        </p>
        {sub?.status === "past_due" || ended ? <ManageBillingButton /> : null}
      </CardContent>
    </Card>
  );
}

export default function SubscribePage({ searchParams }: PageProps<"/subscribe">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <SubscribeContent searchParams={searchParams} />
    </Suspense>
  );
}
