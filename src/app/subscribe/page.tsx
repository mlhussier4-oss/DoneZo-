import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Alert } from "@/components/ui/alert";
import { PlanCard } from "@/components/plans/plan-card";
import { cardFeeNote, planInfo } from "@/config/plans";
import { getCurrentBusiness, requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { confirmSubscriptionSession } from "@/lib/stripe/subscription";
import { createClient } from "@/lib/supabase/server";
import { ManageBillingButton, SubscribeButton } from "./subscribe-buttons";

export const metadata: Metadata = { title: "Subscribe" };


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

  const chosen = business.plan.code;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{ended ? "Your subscription has ended" : `Activate ${business.name}`}</h1>
        <p className="mt-1 text-muted-foreground">
          {ended
            ? `Subscribe again to get back to work. Nothing has been deleted.${sub?.current_period_end ? ` Access ended ${formatDate(sub.current_period_end)}.` : ""}`
            : "Choose your plan. Cancel or switch plans any time."}
        </p>
      </div>
      {params.canceled ? <Alert tone="info">Checkout was canceled. You haven&apos;t been charged.</Alert> : null}
      {typeof params.session_id === "string" ? <Alert tone="info">We&apos;re confirming your payment with Stripe. Refresh in a moment if this page doesn&apos;t update.</Alert> : null}
      {business.memberRole !== "owner" ? <Alert tone="warning">Only the business owner can subscribe.</Alert> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {(["basic", "pro"] as const).map((code) => (
          <PlanCard key={code} plan={code} highlight={chosen === code} badge={chosen === code ? "Your choice" : undefined}>
            {business.memberRole === "owner" ? (
              <SubscribeButton plan={code} variant={chosen === code ? "primary" : "outline"} label={`${ended ? "Resubscribe" : "Subscribe"}: ${planInfo[code].name}, ${planInfo[code].price}/month`} />
            ) : null}
          </PlanCard>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Payment is handled securely by Stripe; DoneZo never sees your card number. No free trial. {cardFeeNote}</p>
      {sub?.status === "past_due" || ended ? <ManageBillingButton /> : null}
    </div>
  );
}

export default function SubscribePage({ searchParams }: PageProps<"/subscribe">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
      <SubscribeContent searchParams={searchParams} />
    </Suspense>
  );
}
