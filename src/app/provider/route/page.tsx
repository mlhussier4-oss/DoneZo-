import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, MapPin, Navigation } from "lucide-react";
import { JobStatusBadge } from "@/components/crm/status-badges";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireProvider } from "@/lib/auth";
import { googleMapsDirectionsUrl, orderStops, routeMiles, type Point } from "@/lib/crm/route";
import { getTeam } from "@/lib/crm/team";
import { addDays, formatIso, isIsoDate } from "@/lib/dates";
import { formatTime, localDateKey, zonedToUtcIso } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Route" };

export default async function RoutePage({ searchParams }: PageProps<"/provider/route">) {
  const { business } = await requireProvider();
  const isManager = business.memberRole !== "employee";
  const tz = business.timezone;
  const params = await searchParams;
  const today = localDateKey(new Date(), tz);
  const date = isIsoDate(params.date) ? params.date : today;
  const order = params.order === "time" ? "time" : "short";
  const team = isManager ? await getTeam(business.id) : [];
  const assignee = typeof params.assignee === "string" && team.some((m) => m.user_id === params.assignee) ? params.assignee : "";

  const supabase = await createClient();
  const [{ data: jobs }, { data: biz }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, status, scheduled_start, crm_customers(full_name), crm_customer_addresses(line1, city, state, postal_code), job_assignments(user_id)")
      .eq("business_id", business.id)
      .gte("scheduled_start", zonedToUtcIso(date, "00:00", tz))
      .lt("scheduled_start", zonedToUtcIso(addDays(date, 1), "00:00", tz))
      .neq("status", "canceled")
      .order("scheduled_start"),
    isManager ? supabase.from("businesses").select("home_zip").eq("id", business.id).single() : Promise.resolve({ data: null }),
  ]);
  const dayJobs = (jobs ?? []).filter((j) => !assignee || j.job_assignments.some((a) => a.user_id === assignee));
  const homeZip = biz?.home_zip ?? null;
  const zips = [...new Set([...dayJobs.map((j) => j.crm_customer_addresses?.postal_code?.slice(0, 5)), homeZip].filter((z): z is string => Boolean(z)))];
  const { data: centers } = zips.length ? await supabase.from("zip_codes").select("zip, latitude, longitude").in("zip", zips) : { data: [] };
  const pointOf = new Map((centers ?? []).map((c) => [c.zip, { lat: c.latitude, lng: c.longitude } as Point]));
  const start = homeZip ? pointOf.get(homeZip) ?? null : null;

  const stops = dayJobs.map((j) => ({ job: j, point: j.crm_customer_addresses ? pointOf.get(j.crm_customer_addresses.postal_code.slice(0, 5)) ?? null : null }));
  const shortest = orderStops(start, stops);
  const shown = order === "time" ? stops : shortest;
  const miles = { time: routeMiles(start, stops.map((s) => s.point)), short: routeMiles(start, shortest.map((s) => s.point)) };
  const addressOf = (j: (typeof dayJobs)[number]) => j.crm_customer_addresses ? `${j.crm_customer_addresses.line1}, ${j.crm_customer_addresses.city}, ${j.crm_customer_addresses.state} ${j.crm_customer_addresses.postal_code}` : null;
  const addresses = shown.map((s) => addressOf(s.job)).filter((a): a is string => Boolean(a));
  const mapsUrl = googleMapsDirectionsUrl(addresses);
  const qs = (o: Record<string, string>) => {
    const u = new URLSearchParams({ date, order, ...(assignee ? { assignee } : {}), ...o });
    return `/provider/route?${u}`;
  };
  const changesTimes = order === "short" && shortest.some((s, i) => s !== stops[i]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Route · {formatIso(date, { weekday: "long", month: "short", day: "numeric" })}</h1>
          <p className="text-sm text-muted-foreground">{dayJobs.length} {dayJobs.length === 1 ? "stop" : "stops"}{dayJobs.length > 1 ? ` · about ${Math.round(miles[order])} mi in a straight line${start ? " from your home ZIP" : ""}` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={qs({ date: addDays(date, -1) })} className={buttonVariants({ variant: "outline", size: "sm" })} aria-label="Previous day"><ChevronLeft /></Link>
          <Link href={qs({ date: today })} className={buttonVariants({ variant: "outline", size: "sm" })}>Today</Link>
          <Link href={qs({ date: addDays(date, 1) })} className={buttonVariants({ variant: "outline", size: "sm" })} aria-label="Next day"><ChevronRight /></Link>
          <nav className="flex gap-1 rounded-lg bg-muted p-1 text-sm" aria-label="Stop order">
            {([["short", "Shortest drive"], ["time", "By time"]] as const).map(([v, label]) => (
              <Link key={v} href={qs({ order: v })} aria-current={order === v ? "page" : undefined} className={cn("rounded-md px-3 py-1 font-medium", order === v ? "bg-card shadow-sm" : "text-muted-foreground")}>{label}</Link>
            ))}
          </nav>
          {mapsUrl ? <a href={mapsUrl} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm" })}><Navigation /> Open in Google Maps <ExternalLink className="size-3.5" /></a> : null}
        </div>
      </div>

      {team.length > 1 ? (
        <nav className="mb-4 flex flex-wrap gap-1 text-sm" aria-label="Filter by person">
          {[{ id: "", label: "Everyone" }, ...team.map((m) => ({ id: m.user_id, label: m.name }))].map((o) => (
            <Link key={o.id || "all"} href={qs({ assignee: o.id })} aria-current={assignee === o.id ? "page" : undefined}
              className={cn("rounded-full border px-3 py-1", assignee === o.id ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:text-foreground")}>{o.label}</Link>
          ))}
        </nav>
      ) : null}

      {!dayJobs.length ? (
        <EmptyState icon={MapPin} title="No visits this day">Scheduled visits with an address show up here as a route.</EmptyState>
      ) : (
        <>
          <Alert tone="info" className="mb-4">
            {order === "short"
              ? `Suggested order by distance, estimated from ZIP code centers${start ? ", starting from your home ZIP" : ""}. ${changesTimes ? "It differs from your appointment times, so check with customers before changing them. " : ""}Google Maps works out the real roads and drive times.`
              : "Visits in appointment order."}
            {addresses.length > 10 ? " Google Maps takes up to 10 stops per link, so the link covers the first 10." : ""}
          </Alert>
          <Card className="divide-y divide-border">
            {shown.map((s, i) => (
              <Link key={s.job.id} href={`/provider/jobs/${s.job.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted sm:px-5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{formatTime(s.job.scheduled_start!, tz)} · {s.job.title} · <span className="text-muted-foreground">{s.job.crm_customers?.full_name}</span></p>
                  <p className="truncate text-sm text-muted-foreground">{addressOf(s.job) ?? "No address on this job"}</p>
                </div>
                <JobStatusBadge status={s.job.status} />
              </Link>
            ))}
          </Card>
        </>
      )}
    </>
  );
}
