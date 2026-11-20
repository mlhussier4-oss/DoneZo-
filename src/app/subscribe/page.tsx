import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Alert } from "@/components/ui/alert";
import { PlanCard } from "@/components/plans/plan-card";
import { freeMonthNote, cardFeeNote, planInfo } from "@/config/plans";
import { getCurrentBusiness, requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { confirmSubscriptionSession } from "@/lib/stripe/subscription";
import { createClient } from "@/lib/supabase/server";
import { ManageBillingButton, SubscribeButton } from "./subscribe-buttons";
import { IOS_PLAN_MESSAGE, isIosApp } from "@/lib/app/server";

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
    supabase.from("business_subscriptions").select("status, current_period_end, trial_card_check, trial_card_message").eq("business_id", business.id).maybeSingle(),
  ]);
  if (access) redirect("/provider");
  // A failed free-month card check isn't an "ended" subscription: they can retry the free month with another card.
  const cardFailed = sub?.trial_card_check === "failed";
  const ended = !cardFailed && sub?.status && ["canceled", "unpaid", "incomplete_expired"].includes(sub.status);

  const chosen = business.plan.code;
  // In the iPhone app, plans are chosen on the website (Apple rule); the plans are still described here.
  const iosApp = await isIosApp();
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
      {cardFailed ? <Alert tone="error" data-testid="card-check-failed">{sub?.trial_card_message ?? "Your card couldn't be verified. Please try another card."} Your free month hasn&apos;t started yet.</Alert> : null}
      {params.canceled ? <Alert tone="info">Checkout was canceled. You haven&apos;t been charged.</Alert> : null}
      {typeof params.session_id === "string" ? <Alert tone="info">We&apos;re confirming your payment with Stripe. Refresh in a moment if this page doesn&apos;t update.</Alert> : null}
      {business.memberRole !== "owner" ? <Alert tone="warning">Only the business owner can subscribe.</Alert> : null}
      {iosApp ? <Alert tone="info" data-testid="ios-plan-note">{IOS_PLAN_MESSAGE} Once you&apos;ve chosen a plan, come back to the app and everything is ready.</Alert> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {(["basic", "pro"] as const).map((code) => (
          <PlanCard key={code} plan={code} highlight={chosen === code} badge={chosen === code ? "Your choice" : undefined}>
            {business.memberRole === "owner" && !iosApp ? (
              <div className="grid gap-2">
                {/* Owner decision 2026-11-15: first month free on Basic only (new businesses). */}
                <SubscribeButton plan={code} variant={chosen === code ? "primary" : "outline"} label={!ended && code === "basic" ? `Start free month, then ${planInfo[code].price}/month` : `${ended ? "Resubscribe" : "Subscribe"} monthly: ${planInfo[code].price}/month`} />
                {/* Owner decision 2026-11-14: pay for 12 months, get 2 free. */}
                <SubscribeButton plan={code} interval="year" variant="accent" label={!ended && code === "basic" ? `Start free month, then ${planInfo[code].yearly}/year (2 months free)` : `Yearly: ${planInfo[code].yearly}/year (2 months free)`} />
              </div>
            ) : null}
          </PlanCard>
        ))}
      </div>
      {iosApp ? null : <p className="text-xs text-muted-foreground">Payment is handled securely by Stripe; HomeHire never sees your card number. {freeMonthNote} To confirm your card is real, we place a temporary hold for the first payment when your free month starts and release it right away; you&apos;re not charged until the free month ends. {cardFeeNote}</p>}
      {!iosApp && (sub?.status === "past_due" || ended) ? <ManageBillingButton /> : null}
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
