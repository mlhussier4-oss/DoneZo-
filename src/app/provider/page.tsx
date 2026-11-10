import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, FileText, Store, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireProvider } from "@/lib/auth";

export const metadata: Metadata = { title: "Overview" };

export default async function ProviderOverviewPage() {
  const { user, business } = await requireProvider();
  const firstName = user.fullName?.split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        description={`${business.name} · ${business.marketplaceEnabled ? "Business Management + Marketplace" : "Business Management"}`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your account</CardTitle>
            <CardDescription>One account for your business tools and, if you choose, the marketplace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Business tools</span>
              <Badge tone="success">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Marketplace</span>
              {business.marketplaceEnabled ? <Badge tone="success">On</Badge> : <Badge>Off</Badge>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plan</span>
              <Badge tone="primary">Free beta</Badge>
            </div>
            <Link href="/provider/settings" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2" })}>
              Business settings
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What&apos;s coming next</CardTitle>
            <CardDescription>This is an early build. These tools are being built in order.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {[
                { icon: Users, text: "Customers: add the customers you already have" },
                { icon: CalendarDays, text: "Calendar and recurring appointments" },
                { icon: FileText, text: "Jobs, estimates and invoices" },
                { icon: Store, text: "Marketplace bidding (if you switch it on)" },
              ].map((item) => (
                <li key={item.text} className="flex gap-3">
                  <item.icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {item.text}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Revenue, jobs and customer numbers will appear here once those tools are built. Nothing on this page is sample data.
      </p>
    </>
  );
}
