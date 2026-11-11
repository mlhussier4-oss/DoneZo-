import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JobStatusBadge } from "@/components/crm/status-badges";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireManager } from "@/lib/auth";
import { frequencyLabels } from "@/lib/crm/labels";
import { getCategoryOptions, getCustomerOptions } from "@/lib/crm/queries";
import { uuid } from "@/lib/crm/schemas";
import { getTeam } from "@/lib/crm/team";
import { splitByNow } from "@/lib/crm/time";
import { centsToInput, formatDateTime, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { updateSchedule } from "../actions";
import { ScheduleForm } from "../schedule-form";
import { ScheduleStatusButtons } from "./schedule-buttons";

export const metadata: Metadata = { title: "Recurring service" };

export default async function SchedulePage({ params }: PageProps<"/provider/recurring/[id]">) {
  const { business } = await requireManager();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: s } = await supabase.from("recurring_schedules").select("*, crm_customers(id, full_name)").eq("id", id).single();
  if (!s) notFound();
  const [customers, categories, { data: visits }, team] = await Promise.all([
    getCustomerOptions(business.id),
    getCategoryOptions(),
    supabase.from("jobs").select("id, scheduled_start, status, price_cents, is_detached").eq("recurring_schedule_id", id)
      .order("scheduled_start").limit(200),
    getTeam(business.id),
  ]);
  const { upcoming, rest } = splitByNow(visits ?? [], (v) => v.scheduled_start);
  const past = rest.reverse();
  const statusBadge = s.status === "active" ? <Badge tone="success">Active</Badge> : s.status === "paused" ? <Badge tone="warning">Paused</Badge> : <Badge tone="danger">Canceled</Badge>;

  return (
    <>
      <div className="mb-6 space-y-2">
        <Link href="/provider/recurring" className="text-sm text-muted-foreground hover:text-foreground">← Recurring services</Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
              {statusBadge}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              <Link href={`/provider/customers/${s.crm_customers?.id}`} className="text-primary hover:underline">{s.crm_customers?.full_name}</Link>
              {" · "}{s.frequency === "custom" ? `Every ${s.interval_days} days` : frequencyLabels[s.frequency]} · {formatMoney(s.price_cents)} per visit
            </p>
          </div>
          <ScheduleStatusButtons scheduleId={s.id} status={s.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader><CardTitle>Edit service</CardTitle></CardHeader>
          <CardContent>
            {s.status === "canceled" ? (
              <p className="text-sm text-muted-foreground">This service was canceled. Its past visits are kept for your records.</p>
            ) : (
              <ScheduleForm
                action={updateSchedule.bind(null, s.id)}
                customers={customers}
                categories={categories}
                lockCustomer
                team={team}
                submitLabel="Save changes"
                defaults={{
                  customerId: s.customer_id,
                  addressId: s.address_id,
                  categoryId: s.category_id,
                  title: s.title,
                  description: s.description,
                  price: centsToInput(s.price_cents),
                  frequency: s.frequency,
                  intervalDays: s.interval_days,
                  startDate: s.start_date,
                  startTime: s.start_time.slice(0, 5),
                  durationMinutes: s.duration_minutes,
                  defaultAssignee: s.default_assignee,
                  endDate: s.end_date,
                }}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Upcoming visits ({upcoming.length})</CardTitle></CardHeader>
            <CardContent>
              {upcoming.length ? (
                <ul className="max-h-96 space-y-1 overflow-y-auto text-sm">
                  {upcoming.map((v) => (
                    <li key={v.id}>
                      <Link href={`/provider/jobs/${v.id}`} className="flex items-center justify-between gap-2 rounded px-1 py-1.5 hover:bg-muted">
                        <span>{formatDateTime(v.scheduled_start, business.timezone)}{v.is_detached ? " *" : ""}</span>
                        <JobStatusBadge status={v.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No upcoming visits.</p>}
              {upcoming.some((v) => v.is_detached) ? <p className="mt-2 text-xs text-muted-foreground">* Changed by hand; not affected by edits to this service.</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Past visits ({past.length})</CardTitle></CardHeader>
            <CardContent>
              {past.length ? (
                <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
                  {past.map((v) => (
                    <li key={v.id}>
                      <Link href={`/provider/jobs/${v.id}`} className="flex items-center justify-between gap-2 rounded px-1 py-1.5 hover:bg-muted">
                        <span>{formatDateTime(v.scheduled_start, business.timezone)}</span>
                        <JobStatusBadge status={v.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">None yet.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
