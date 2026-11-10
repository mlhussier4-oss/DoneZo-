import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Plus, Repeat } from "lucide-react";
import { JobStatusBadge } from "@/components/crm/status-badges";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireProvider } from "@/lib/auth";
import { formatDateTime, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Jobs" };

const tabs = [
  { value: "upcoming", label: "Upcoming" },
  { value: "unscheduled", label: "Unscheduled" },
  { value: "active", label: "In progress / unpaid" },
  { value: "past", label: "Past" },
  { value: "canceled", label: "Canceled" },
] as const;
type Tab = (typeof tabs)[number]["value"];

export default async function JobsPage({ searchParams }: PageProps<"/provider/jobs">) {
  const { business } = await requireProvider();
  const params = await searchParams;
  const tab: Tab = tabs.some((t) => t.value === params.tab) ? (params.tab as Tab) : "upcoming";
  const nowIso = new Date().toISOString();

  const supabase = await createClient();
  let q = supabase
    .from("jobs")
    .select("id, title, status, scheduled_start, price_cents, source, recurring_schedule_id, crm_customers(full_name)")
    .eq("business_id", business.id)
    .limit(300);
  if (tab === "upcoming") q = q.in("status", ["new", "scheduled"]).gte("scheduled_start", nowIso).order("scheduled_start");
  if (tab === "unscheduled") q = q.is("scheduled_start", null).neq("status", "canceled").order("created_at", { ascending: false });
  if (tab === "active") q = q.in("status", ["in_progress", "awaiting_payment"]).order("scheduled_start");
  if (tab === "past") q = q.in("status", ["completed", "new", "scheduled"]).lt("scheduled_start", nowIso).order("scheduled_start", { ascending: false });
  if (tab === "canceled") q = q.eq("status", "canceled").order("scheduled_start", { ascending: false });
  const { data: jobs } = await q;

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Every visit, for marketplace customers and your own."
        actions={
          <>
            <Link href="/provider/recurring" className={buttonVariants({ variant: "outline" })}><Repeat /> Recurring</Link>
            <Link href="/provider/jobs/new" className={buttonVariants()}><Plus /> New job</Link>
          </>
        }
      />
      <nav className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-muted p-1 text-sm" aria-label="Job lists">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/provider/jobs?tab=${t.value}`}
            aria-current={tab === t.value ? "page" : undefined}
            className={cn("shrink-0 rounded-md px-3 py-1.5 font-medium", tab === t.value ? "bg-card shadow-sm" : "text-muted-foreground")}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {!jobs?.length ? (
        <EmptyState icon={Briefcase} title="No jobs here" action={<Link href="/provider/jobs/new" className={buttonVariants({ size: "sm" })}>Create a job</Link>}>
          {tab === "past" ? "Visits whose date has passed show up here, including ones not yet marked complete." : null}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-border">
          {jobs.map((j) => (
            <Link key={j.id} href={`/provider/jobs/${j.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <p className="font-medium">{j.title}{j.recurring_schedule_id ? <Repeat className="ml-1.5 inline size-3.5 text-muted-foreground" aria-label="Recurring" /> : null}</p>
                <p className="text-sm text-muted-foreground">{j.crm_customers?.full_name} · {formatDateTime(j.scheduled_start, business.timezone)}</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span>{formatMoney(j.price_cents)}</span>
                <JobStatusBadge status={j.status} />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
