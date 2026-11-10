import type { Metadata } from "next";
import Link from "next/link";
import { ComingSoon } from "@/components/ui/coming-soon";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Post a job" };

export default function PostJobPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Post a job</h1>
      <ComingSoon title="Job posting" phase="Phase 3 (Marketplace)">
        <p>
          Customers will pick a service, add photos, describe the job, choose timing and enter a ZIP code, then confirm
          with a one-time email code. No card is needed.
        </p>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}>
          Back to home
        </Link>
      </ComingSoon>
    </div>
  );
}
