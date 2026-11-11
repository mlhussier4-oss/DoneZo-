import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Repeat } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireProvider } from "@/lib/auth";
import { jobStatuses } from "@/lib/crm/labels";
import { getTeam, initials } from "@/lib/crm/team";
import { addDays, addMonths, daysBetween, formatIso, isIsoDate, startOfMonth, startOfWeek } from "@/lib/dates";
import { formatTime, localDateKey, zonedToUtcIso } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendar" };

type View = "day" | "week" | "month";
type CalJob = { id: string; title: string; status: string; scheduled_start: string; customer: string; recurring: boolean; people: string };

const statusStyle: Record<string, string> = {
  new: "border-l-muted-foreground bg-muted",
  scheduled: "border-l-primary bg-primary-soft",
  in_progress: "border-l-accent bg-accent-soft",
  awaiting_payment: "border-l-warning bg-warning-soft",
  completed: "border-l-success bg-success-soft",
  canceled: "border-l-destructive bg-destructive-soft line-through opacity-70",
};

function JobChip({ job, tz, compact = false }: { job: CalJob; tz: string; compact?: boolean }) {
  return (
    <Link
      href={`/provider/jobs/${job.id}`}
      className={cn("block rounded-md border-l-4 px-2 py-1 text-xs leading-tight hover:brightness-95", statusStyle[job.status])}
      title={`${job.title} · ${job.customer}`}
    >
      <span className="font-medium">{formatTime(job.scheduled_start, tz)}</span>{" "}
      <span className={compact ? "" : "font-medium"}>{job.title}</span>
      {job.recurring ? <Repeat className="ml-1 inline size-3" aria-label="Recurring" /> : null}
      {job.people ? <span className="ml-1 rounded bg-card/80 px-1 text-[10px] font-semibold" title="Assigned to">{job.people}</span> : null}
      {!compact ? <span className="block text-muted-foreground">{job.customer}</span> : null}
    </Link>
  );
}

export default async function CalendarPage({ searchParams }: PageProps<"/provider/calendar">) {
  const { business } = await requireProvider();
  const isManager = business.memberRole !== "employee";
  const tz = business.timezone;
  const params = await searchParams;
  const view: View = params.view === "day" || params.view === "month" ? params.view : "week";
  const today = localDateKey(new Date(), tz);
  const date = isIsoDate(params.date) ? params.date : today;

  let from: string, to: string, prev: string, next: string, title: string;
  if (view === "day") {
    from = date; to = addDays(date, 1); prev = addDays(date, -1); next = addDays(date, 1);
    title = formatIso(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  } else if (view === "week") {
    from = startOfWeek(date); to = addDays(from, 7); prev = addDays(from, -7); next = addDays(from, 7);
    title = `${formatIso(from, { month: "short", day: "numeric" })} – ${formatIso(addDays(to, -1), { month: "short", day: "numeric", year: "numeric" })}`;
  } else {
    const first = startOfMonth(date);
    from = startOfWeek(first);
    const nextMonth = addMonths(first, 1);
    to = addDays(startOfWeek(addDays(nextMonth, -1)), 7);
    prev = addMonths(first, -1); next = nextMonth;
    title = formatIso(first, { month: "long", year: "numeric" });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, title, status, scheduled_start, recurring_schedule_id, crm_customers(full_name), job_assignments(user_id)")
    .eq("business_id", business.id)
    .gte("scheduled_start", zonedToUtcIso(from, "00:00", tz))
    .lt("scheduled_start", zonedToUtcIso(to, "00:00", tz))
    .eq(business.hasCrm ? "business_id" : "source", business.hasCrm ? business.id : "marketplace") // Basic: marketplace jobs only
    .order("scheduled_start")
    .limit(2000);

  // Employees only ever receive their own jobs (database rules); managers can filter by person.
  const team = isManager ? await getTeam(business.id) : [];
  const assignee = typeof params.assignee === "string" && (params.assignee === "unassigned" || team.some((m) => m.user_id === params.assignee)) ? params.assignee : "";
  const nameOf = new Map(team.map((m) => [m.user_id, m.name]));
  const shown = (data ?? []).filter((j) =>
    !assignee ? true : assignee === "unassigned" ? j.job_assignments.length === 0 : j.job_assignments.some((a) => a.user_id === assignee));
  const byDay = new Map<string, CalJob[]>();
  for (const j of shown) {
    if (!j.scheduled_start) continue;
    const key = localDateKey(j.scheduled_start, tz);
    const list = byDay.get(key) ?? [];
    list.push({ id: j.id, title: j.title, status: j.status, scheduled_start: j.scheduled_start, customer: j.crm_customers?.full_name ?? "", recurring: Boolean(j.recurring_schedule_id), people: team.length > 1 ? j.job_assignments.map((a) => initials(nameOf.get(a.user_id) ?? "?")).join(" ") : "" });
    byDay.set(key, list);
  }
  const days = daysBetween(from, to);
  const link = (v: View, d: string, a = assignee) => `/provider/calendar?view=${v}&date=${d}${a ? `&assignee=${a}` : ""}`;
  const activeCount = shown.filter((j) => j.status !== "canceled").length;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{activeCount} {activeCount === 1 ? "visit" : "visits"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Link href={link(view, prev)} className={buttonVariants({ variant: "outline", size: "sm" })} aria-label="Previous"><ChevronLeft /></Link>
            <Link href={link(view, today)} className={buttonVariants({ variant: "outline", size: "sm" })}>Today</Link>
            <Link href={link(view, next)} className={buttonVariants({ variant: "outline", size: "sm" })} aria-label="Next"><ChevronRight /></Link>
          </div>
          <nav className="flex gap-1 rounded-lg bg-muted p-1 text-sm" aria-label="Calendar view">
            {(["day", "week", "month"] as const).map((v) => (
              <Link key={v} href={link(v, date)} aria-current={view === v ? "page" : undefined}
                className={cn("rounded-md px-3 py-1 font-medium capitalize", view === v ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {v}
              </Link>
            ))}
          </nav>
          {team.length > 1 ? (
            <nav className="flex flex-wrap gap-1 text-sm" aria-label="Filter by person">
              {[{ id: "", label: "Everyone" }, ...team.map((m) => ({ id: m.user_id, label: m.name })), { id: "unassigned", label: "Unassigned" }].map((o) => (
                <Link key={o.id || "all"} href={link(view, date, o.id)} aria-current={assignee === o.id ? "page" : undefined}
                  className={cn("rounded-full border px-3 py-1", assignee === o.id ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
                  {o.label}
                </Link>
              ))}
            </nav>
          ) : null}
          {isManager && business.hasCrm && view === "day" && byDay.get(date)?.length ? <Link href={`/provider/route?date=${date}${assignee && assignee !== "unassigned" ? `&assignee=${assignee}` : ""}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Plan route</Link> : null}
          {isManager && business.hasCrm ? <Link href={`/provider/jobs/new?date=${view === "day" ? date : today}`} className={buttonVariants({ size: "sm" })}><Plus /> New job</Link> : null}
        </div>
      </div>

      {view === "month" ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-muted text-center text-xs font-medium text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const jobs = byDay.get(d) ?? [];
              const inMonth = d.slice(0, 7) === startOfMonth(date).slice(0, 7);
              return (
                <div key={d} className={cn("min-h-16 border-r border-b border-border p-1 sm:min-h-28", !inMonth && "bg-muted/50")}>
                  <Link href={link("day", d)} className={cn("mb-1 inline-flex size-7 items-center justify-center rounded-full text-xs font-medium hover:bg-muted",
                    d === today && "bg-primary text-primary-foreground hover:bg-primary-hover", !inMonth && "text-muted-foreground")}>
                    {Number(d.slice(8))}
                  </Link>
                  <div className="hidden space-y-1 sm:block">
                    {jobs.slice(0, 3).map((j) => <JobChip key={j.id} job={j} tz={tz} compact />)}
                    {jobs.length > 3 ? <Link href={link("day", d)} className="block px-1 text-xs text-primary">+{jobs.length - 3} more</Link> : null}
                  </div>
                  {jobs.length ? (
                    <Link href={link("day", d)} className="block text-center text-xs font-medium text-primary sm:hidden">{jobs.length}</Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className={cn("grid gap-3", view === "week" && "lg:grid-cols-7")}>
          {days.map((d) => {
            const jobs = byDay.get(d) ?? [];
            return (
              <Card key={d} className={cn("p-3", d === today && "ring-2 ring-primary")}>
                <Link href={link("day", d)} className="mb-2 flex items-baseline justify-between gap-2 hover:text-primary lg:block">
                  <span className="text-xs font-medium text-muted-foreground uppercase">{formatIso(d, { weekday: "short" })}</span>
                  <span className="ml-2 font-semibold lg:ml-0 lg:block">{formatIso(d, { month: "short", day: "numeric" })}</span>
                </Link>
                <div className="space-y-1.5">
                  {jobs.map((j) => <JobChip key={j.id} job={j} tz={tz} />)}
                  {!jobs.length ? <p className="text-xs text-muted-foreground">No visits</p> : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ul className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground" aria-label="Legend">
        {jobStatuses.map((s) => (
          <li key={s.value} className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-sm border-l-4", statusStyle[s.value])} aria-hidden />{s.label}
          </li>
        ))}
      </ul>
    </>
  );
}
