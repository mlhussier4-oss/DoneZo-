import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, MapPin, Navigation } from "lucide-react";
import { JobStatusBadge } from "@/components/crm/status-badges";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireProvider } from "@/lib/auth";
import { isoDaysAgo } from "@/lib/crm/time";
import { formatDateTime, localDateKey } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My jobs" };

export default async function MyJobsPage() {
  const { user, business } = await requireProvider();
  const tz = business.timezone;
  const supabase = await createClient();
  const since = isoDaysAgo(14);
  const { data: assigned } = await supabase.from("job_assignments").select("job_id").eq("user_id", user.id).eq("business_id", business.id);
  const ids = (assigned ?? []).map((a) => a.job_id);
  const { data: jobs } = ids.length
    ? await supabase
        .from("jobs")
        .select("id, title, status, scheduled_start, crm_customers(full_name), crm_customer_addresses(line1, city)")
        .in("id", ids)
        .or(`scheduled_start.gte.${since},scheduled_start.is.null`)
        .order("scheduled_start", { nullsFirst: false })
        .limit(200)
    : { data: [] };
  const today = localDateKey(new Date(), tz);
  const todays = (jobs ?? []).filter((j) => j.scheduled_start && localDateKey(j.scheduled_start, tz) === today);
  const upcoming = (jobs ?? []).filter((j) => j.scheduled_start && localDateKey(j.scheduled_start, tz) > today && !["completed", "canceled"].includes(j.status));
  const recent = (jobs ?? []).filter((j) => !todays.includes(j) && !upcoming.includes(j));
  const firstName = user.fullName?.split(" ")[0];

  const list = (rows: typeof todays) => (
    <Card className="divide-y divide-border">
      {rows.map((j) => (
        <Link key={j.id} href={`/provider/jobs/${j.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="font-medium">{formatDateTime(j.scheduled_start, tz)} · {j.title}</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              {j.crm_customers?.full_name}{j.crm_customer_addresses ? <><MapPin className="ml-1 size-3.5" aria-hidden />{j.crm_customer_addresses.line1}, {j.crm_customer_addresses.city}</> : null}
            </p>
          </div>
          <JobStatusBadge status={j.status} />
        </Link>
      ))}
    </Card>
  );

  return (
    <>
      <PageHeader
        title={firstName ? `Hi, ${firstName}` : "My jobs"}
        description={`Jobs assigned to you at ${business.name}.`}
        actions={todays.length > 1 ? <Link href={`/provider/route?date=${today}`} className={buttonVariants({ variant: "outline" })}><Navigation /> Today&apos;s route</Link> : null}
      />
      <h2 className="mb-2 font-semibold">Today</h2>
      {todays.length ? list(todays) : <p className="mb-2 text-sm text-muted-foreground">Nothing assigned to you today.</p>}
      <h2 className="mt-6 mb-2 font-semibold">Coming up</h2>
      {upcoming.length ? list(upcoming.slice(0, 30)) : <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>}
      {recent.length ? (<><h2 className="mt-6 mb-2 font-semibold">Recent</h2>{list(recent.slice(0, 20))}</>) : null}
      {!jobs?.length ? <div className="mt-6"><EmptyState icon={Briefcase} title="No jobs assigned yet">Your manager will assign jobs to you here.</EmptyState></div> : null}
    </>
  );
}
