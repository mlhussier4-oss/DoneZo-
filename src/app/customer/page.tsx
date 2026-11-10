import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "My account" };

export default async function CustomerHomePage() {
  const user = await requireRole("customer");
  const firstName = user.fullName?.split(" ")[0];
  return (
    <>
      <PageHeader title={firstName ? `Hi, ${firstName}` : "Welcome"} description="Your jobs, bids and payments will appear here." />
      <Card>
        <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Need something done?</p>
            <p className="text-sm text-muted-foreground">Post a job and local providers will send you bids.</p>
          </div>
          <Link href="/post-job" className={buttonVariants({ variant: "accent" })}>
            Post a job
          </Link>
        </CardContent>
      </Card>
      <p className="mt-6 text-sm text-muted-foreground">
        Job posting, bids, messaging and payments are being built in the Marketplace and Payments phases.
      </p>
    </>
  );
}
