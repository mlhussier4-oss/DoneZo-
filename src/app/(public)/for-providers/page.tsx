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

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Why pros choose HomeHire">
        {[
          { title: "New customers nearby", text: "Real local jobs with photos and details land on your job board as they're posted." },
          { title: "Your price, sealed bids", text: "Bid only on the jobs you want, at your price. Bids are sealed." },
          { title: "Get paid your way", text: "Take cards through HomeHire, or cash, Venmo, Cash App and check with no HomeHire fee." },
          { title: "No paying per lead!", text: "Save money and bid on as many jobs that come in as you want.", bold: true },
        ].map((item) => (
          <li key={item.title} className="rounded-lg border border-border border-t-4 border-t-cta bg-card p-4 shadow-sm">
            <p className={"bold" in item && item.bold ? "text-lg font-extrabold" : "font-semibold"}>{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
          </li>
        ))}
      </ul>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
        <PlanCard plan="priority" badge="Get there first">
          <p className="mb-3 text-sm text-muted-foreground">When a job is posted near you, you get it 5 minutes before other pros.</p>
          <Link href="/signup/provider?plan=priority" className={buttonVariants({ variant: "outline", className: "w-full" })}>Start with Priority</Link>
        </PlanCard>
      </div>

      <div className="mt-8 rounded-lg border border-cta bg-accent-soft p-4 text-sm" data-testid="referral-promo">
        <p className="font-semibold">Refer pros, get HomeHire free</p>
        <p className="text-muted-foreground">Every 2 providers who join with your personal link and are charged for their subscription (any plan, after any free month) = 1 free month of your plan, whichever plan you&apos;re on.</p>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        <strong className="text-foreground">HomeHire Basic: first month free</strong>, then $9.99/month. Cancel or switch plans any time. {cardFeeNote}
      </p>
    </div>
  );
}
