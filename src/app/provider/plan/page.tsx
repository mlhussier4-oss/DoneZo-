import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { PlanCard } from "@/components/plans/plan-card";
import { PageHeader } from "@/components/ui/page-header";
import { cardFeeNote, planInfo } from "@/config/plans";
import { requireManager } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { refreshSubscription } from "@/lib/stripe/subscription";
import { createClient } from "@/lib/supabase/server";
import { ManageBillingButton } from "../../subscribe/subscribe-buttons";
import { ChangePlanButton } from "./plan-buttons";

export const metadata: Metadata = { title: "Plan & billing" };

export default async function PlanPage({ searchParams }: PageProps<"/provider/plan">) {
  const params = await searchParams;
  // Back from Stripe after switching: read the subscription from Stripe so the new plan shows right away.
  if (params.changed) {
    const { business } = await requireManager();
    try { await refreshSubscription(business.id); } catch (err) { console.error("refresh subscription failed", err); }
  }
  const { business } = await requireManager();
  const isOwner = business.memberRole === "owner";
  const current = business.plan.code;
  const supabase = await createClient();
  const { data: sub } = await supabase.from("business_subscriptions").select("status, current_period_end, cancel_at_period_end").eq("business_id", business.id).maybeSingle();

  return (
    <>
      <PageHeader title="Plan & billing" description={`${business.name} is on ${planInfo[current].name}, ${planInfo[current].price}/month.`} />
      {params.need === "pro" ? (
        <Alert tone="info" className="mb-4">That&apos;s part of <strong>HomeHire Pro</strong>: business tools for all your customers. {isOwner ? "Upgrade below; it starts right away." : "Ask the business owner to upgrade."}</Alert>
      ) : null}
      {params.changed ? <Alert tone="success" className="mb-4">Your plan change was saved. If you switched to Basic, it takes effect at your next billing date.</Alert> : null}
      {sub?.current_period_end ? (
        <p className="mb-4 text-sm text-muted-foreground">
          {sub.cancel_at_period_end ? `Your subscription ends ${formatDate(sub.current_period_end)}.` : `Next billing date: ${formatDate(sub.current_period_end)}.`}
          {sub.status === "past_due" ? " Stripe couldn't charge your card; update it under Manage billing." : ""}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard plan="basic" highlight={current === "basic"} badge={current === "basic" ? "Current plan" : undefined}>
          {current === "pro" && isOwner ? (
            <div className="space-y-2">
              <ChangePlanButton plan="basic" variant="outline" label="Switch to Basic" />
              <p className="text-xs text-muted-foreground">Takes effect at your next billing date. Your customers, invoices and reports are kept but hidden, and come back if you return to Pro. Team members lose access.</p>
            </div>
          ) : null}
        </PlanCard>
        <PlanCard plan="pro" highlight={current === "pro"} badge={current === "pro" ? "Current plan" : undefined}>
          {current === "basic" && isOwner ? (
            <div className="space-y-2">
              <ChangePlanButton plan="pro" label="Upgrade to Pro, $19.99/month" />
              <p className="text-xs text-muted-foreground">Starts right away. Stripe shows you the amount before you confirm: just the difference for the rest of this billing month.</p>
            </div>
          ) : null}
        </PlanCard>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">{cardFeeNote}</p>
      {isOwner ? <div className="mt-6"><ManageBillingButton /><p className="mt-1 text-xs text-muted-foreground">Update your card, see receipts or cancel on Stripe&apos;s secure page.</p></div>
        : <p className="mt-6 text-sm text-muted-foreground">Only the business owner can change the plan or billing.</p>}
    </>
  );
}
