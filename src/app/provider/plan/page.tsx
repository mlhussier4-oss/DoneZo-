import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { PlanCard } from "@/components/plans/plan-card";
import { PageHeader } from "@/components/ui/page-header";
import { PLAN_CODES, cardFeeNote, planInfo, planRank } from "@/config/plans";
import { requireManager } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { refreshSubscription } from "@/lib/stripe/subscription";
import { createClient } from "@/lib/supabase/server";
import { ManageBillingButton } from "../../subscribe/subscribe-buttons";
import { ChangePlanButton } from "./plan-buttons";
import { IOS_PLAN_MESSAGE, isIosApp } from "@/lib/app/server";

export const metadata: Metadata = { title: "Plan & billing" };

export default async function PlanPage({ searchParams }: PageProps<"/provider/plan">) {
  const params = await searchParams;
  // Back from Stripe after switching: read the subscription from Stripe so the new plan shows right away.
  if (params.changed) {
    const { business } = await requireManager();
    try { await refreshSubscription(business.id); } catch (err) { console.error("refresh subscription failed", err); }
  }
  const { business } = await requireManager();
  // In the iPhone app, plans and billing are managed on the website (Apple rule); here they're only shown.
  const iosApp = await isIosApp();
  const isOwner = business.memberRole === "owner";
  const canBuy = isOwner && !iosApp;
  const current = business.plan.code;
  const supabase = await createClient();
  const { data: sub } = await supabase.from("business_subscriptions").select("status, current_period_end, cancel_at_period_end").eq("business_id", business.id).maybeSingle();

  return (
    <>
      <PageHeader title="Plan & billing" description={`${business.name} is on ${planInfo[current].name}, ${planInfo[current].price}/month.`} />
      {params.need === "pro" ? (
        <Alert tone="info" className="mb-4">That&apos;s part of <strong>HomeHire Pro</strong>: business tools for all your customers. {iosApp ? "Upgrades are made on the HomeHire website." : isOwner ? "Upgrade below; it starts right away." : "Ask the business owner to upgrade."}</Alert>
      ) : null}
      {params.changed ? <Alert tone="success" className="mb-4">Your plan change was saved. If you moved to a lower plan, it takes effect at your next billing date.</Alert> : null}
      {sub?.current_period_end ? (
        <p className="mb-4 text-sm text-muted-foreground">
          {sub.cancel_at_period_end ? `Your subscription ends ${formatDate(sub.current_period_end)}.` : `Next billing date: ${formatDate(sub.current_period_end)}.`}
          {sub.status === "past_due" ? (iosApp ? " Stripe couldn't charge your card; update it on the HomeHire website." : " Stripe couldn't charge your card; update it under Manage billing.") : ""}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLAN_CODES.map((code) => (
          <PlanCard key={code} plan={code} highlight={current === code} badge={current === code ? "Current plan" : undefined}>
            {current !== code && canBuy ? (
              <div className="space-y-2">
                {planRank[code] > planRank[current] ? (
                  <>
                    <ChangePlanButton plan={code} label={`Upgrade to ${planInfo[code].name.replace("HomeHire ", "")}, ${planInfo[code].price}/month`} />
                    <p className="text-xs text-muted-foreground">Starts right away. Stripe shows you the amount before you confirm: just the difference for the rest of this billing period.{code === "priority" && current !== "priority" ? " Priority is billed monthly." : ""}</p>
                  </>
                ) : (
                  <>
                    <ChangePlanButton plan={code} variant="outline" label={`Switch to ${planInfo[code].name.replace("HomeHire ", "")}`} />
                    <p className="text-xs text-muted-foreground">
                      Takes effect at your next billing date.{" "}
                      {code === "basic"
                        ? "Your customers, invoices and reports are kept but hidden, and come back if you return to Pro. Team members lose access."
                        : "You keep every business tool; only the 5-minute head start on new jobs ends."}
                    </p>
                  </>
                )}
              </div>
            ) : null}
          </PlanCard>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">{cardFeeNote}</p>
      {iosApp ? <Alert tone="info" className="mt-6" data-testid="ios-plan-note">{IOS_PLAN_MESSAGE}</Alert>
        : isOwner ? <div className="mt-6"><ManageBillingButton /><p className="mt-1 text-xs text-muted-foreground">Update your card, see receipts or cancel on Stripe&apos;s secure page.</p></div>
        : <p className="mt-6 text-sm text-muted-foreground">Only the business owner can change the plan or billing.</p>}
    </>
  );
}
