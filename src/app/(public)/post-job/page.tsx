import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActiveCategories } from "@/lib/data/categories";
import { localDateKey } from "@/lib/format";
import { PostJobWizard } from "./post-job-wizard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Post a job" };

async function Wizard({ searchParams }: { searchParams: PageProps<"/post-job">["searchParams"] }) {
  const [categories, user, params] = await Promise.all([getActiveCategories(), getCurrentUser(), searchParams]);
  // An account comes first (owner decision 2026-11-13): new customers sign up, returning ones log in, guests save theirs.
  const here = `/post-job${typeof params.category === "string" ? `?category=${encodeURIComponent(params.category)}` : ""}`;
  if (!user) redirect(`/signup/customer?next=${encodeURIComponent(here)}`);
  if (user.role === "customer" && !user.email) redirect(`/customer/account?save=1&next=${encodeURIComponent(here)}`);
  // "Book again" (owner request 2026-11-14): start from a finished job's answers; the pro who did it is invited.
  const againId = typeof params.again === "string" && /^[0-9a-f-]{36}$/.test(params.again) ? params.again : null;
  const supabase = await createClient();
  const [{ data: past }, { data: home }] = await Promise.all([
    againId
      ? supabase.from("service_requests").select("id, description, details, zip, service_categories(slug)").eq("id", againId).eq("customer_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user.role === "customer" ? supabase.from("customer_homes").select("zip, details").eq("customer_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return (
    <PostJobWizard
      categories={categories}
      home={home ? { zip: home.zip, details: (home.details ?? {}) as Record<string, string> } : undefined}
      again={past ? { id: past.id, description: past.description, details: (past.details ?? {}) as Record<string, string>, zip: past.zip } : undefined}
      initialCategory={past?.service_categories?.slug ?? (typeof params.category === "string" ? params.category : undefined)}
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
