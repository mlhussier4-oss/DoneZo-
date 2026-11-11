import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PlanCard } from "@/components/plans/plan-card";
import { cardFeeNote } from "@/config/plans";

export const metadata: Metadata = { title: "For providers" };

export default function ForProvidersPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="max-w-2xl space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Software that runs your business, and jobs when you want them</h1>
        <p className="text-lg text-muted-foreground">
          Use the business tools on their own, or add the marketplace to win new customers. It&apos;s one account either
          way, and you can switch the marketplace on later without moving any data.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <PlanCard plan="basic">
          <p className="mb-3 text-sm text-muted-foreground">No fees per lead. You choose which jobs to bid on.</p>
          <Link href="/signup/provider?plan=basic" className={buttonVariants({ variant: "outline", className: "w-full" })}>Start with Basic</Link>
        </PlanCard>
        <PlanCard plan="pro" highlight badge="Run your whole business">
          <div className="grid gap-2">
            <Link href="/signup/provider?plan=marketplace" className={buttonVariants({ className: "w-full" })}>Start with Pro</Link>
            <Link href="/signup/provider?plan=crm" className={buttonVariants({ variant: "ghost", size: "sm", className: "w-full" })}>Pro without the marketplace (business tools only)</Link>
          </div>
        </PlanCard>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Cancel or switch plans any time; no free trial. {cardFeeNote}
      </p>
    </div>
  );
}
