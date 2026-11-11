import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "For providers" };

const crmFeatures = [
  "Customer database with notes, photos and history",
  "Calendar with recurring appointments",
  "Jobs, estimates and invoices",
  "Card payments through Stripe",
  "Record cash, Venmo and Cash App payments",
  "Revenue tracking and reports",
];

const marketplaceFeatures = [
  "Everything in Business Management",
  "Public profile with reviews and portfolio",
  "Choose your service area and services",
  "Browse local job requests and send bids",
  "Message customers once they accept your bid",
  "Marketplace jobs land in the same calendar and CRM",
];

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
        <Card>
          <CardHeader>
            <CardTitle>Business Management</CardTitle>
            <CardDescription>For businesses that already have customers and want software to run operations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-2 text-sm">
              {crmFeatures.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {f}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">You never have to bid or receive job alerts.</p>
            <Link href="/signup/provider?plan=crm" className={buttonVariants({ variant: "outline", className: "w-full" })}>
              Start with Business Management
            </Link>
          </CardContent>
        </Card>

        <Card className="border-primary ring-1 ring-primary">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Business Management + Marketplace</CardTitle>
              <Badge tone="primary">Win new customers</Badge>
            </div>
            <CardDescription>All the business tools, plus local job requests you can bid on.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-2 text-sm">
              {marketplaceFeatures.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {f}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">No fees per lead. You choose which jobs to bid on.</p>
            <Link href="/signup/provider?plan=marketplace" className={buttonVariants({ className: "w-full" })}>
              Start with the Marketplace
            </Link>
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        One plan: $9.99/month, everything included, cancel any time. A 10% fee applies to card payments your customers make through DoneZo; no fee on cash, Venmo or Cash App.
      </p>
    </div>
  );
}
