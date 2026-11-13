import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActiveCategories } from "@/lib/data/categories";
import { localDateKey } from "@/lib/format";
import { PostJobWizard } from "./post-job-wizard";

export const metadata: Metadata = { title: "Post a job" };

async function Wizard({ searchParams }: { searchParams: PageProps<"/post-job">["searchParams"] }) {
  const [categories, user, params] = await Promise.all([getActiveCategories(), getCurrentUser(), searchParams]);
  // An account comes first (owner decision 2026-11-13): new customers sign up, returning ones log in, guests save theirs.
  const here = `/post-job${typeof params.category === "string" ? `?category=${encodeURIComponent(params.category)}` : ""}`;
  if (!user) redirect(`/signup/customer?next=${encodeURIComponent(here)}`);
  if (user.role === "customer" && !user.email) redirect(`/customer/account?save=1&next=${encodeURIComponent(here)}`);
  return (
    <PostJobWizard
      categories={categories}
      initialCategory={typeof params.category === "string" ? params.category : undefined}
      signedInRole={user.role}
      today={localDateKey(new Date(), "America/Chicago")}
    />
  );
}

export default function PostJobPage({ searchParams }: PageProps<"/post-job">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-2xl animate-pulse px-4 py-10"><div className="h-full rounded-lg bg-muted" /></div>}>
      <Wizard searchParams={searchParams} />
    </Suspense>
  );
}
