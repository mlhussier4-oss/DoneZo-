import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, MapPin, Repeat, Tag, User } from "lucide-react";
import { InvoiceStatusBadge, JobStatusBadge } from "@/components/crm/status-badges";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProvider } from "@/lib/auth";
import { jobStatus, type JobStatus } from "@/lib/crm/labels";
import { uuid } from "@/lib/crm/schemas";
import { formatDate, formatDateTime, formatMoney, formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getTeam } from "@/lib/crm/team";
import { AssigneePicker, CreateInvoiceButton, DeletePhotoButton, NotesForm, PhotoUploader, StatusControls } from "./job-controls";

export const metadata: Metadata = { title: "Job" };

export default async function JobPage({ params }: PageProps<"/provider/jobs/[id]">) {
  const { business } = await requireProvider();
  const isManager = business.memberRole !== "employee";
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const tz = business.timezone;
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("*, crm_customers(id, full_name, phone), crm_customer_addresses(line1, line2, city, state, postal_code, access_notes), service_categories(name), recurring_schedules(id, title)")
    .eq("id", id)
    .single();
  if (!job) notFound();

  const [{ data: photos }, { data: invoices }, { data: history }, { data: booking }, { data: assignments }, team] = await Promise.all([
    supabase.from("job_photos").select("id, storage_path, caption, created_at").eq("job_id", id).order("created_at"),
    supabase.from("invoices").select("id, number, status, total_cents").eq("job_id", id).order("number"),
    supabase.from("job_status_history").select("id, to_status, changed_at").eq("job_id", id).order("id"),
    supabase.from("bookings").select("id").eq("job_id", id).maybeSingle(),
    supabase.from("job_assignments").select("user_id").eq("job_id", id),
    getTeam(business.id),
  ]);
  const assignedIds = (assignments ?? []).map((a) => a.user_id);
  const assignedNames = team.filter((m) => assignedIds.includes(m.user_id)).map((m) => m.name);
  const signed = photos?.length
    ? (await supabase.storage.from("job-photos").createSignedUrls(photos.map((p) => p.storage_path), 3600)).data ?? []
    : [];
  const urlFor = new Map(signed.map((s) => [s.path, s.signedUrl]));
  const addr = job.crm_customer_addresses;
  const openInvoices = (invoices ?? []).filter((i) => i.status !== "void");

  return (
    <>
      <div className="mb-6 space-y-2">
        <Link href={isManager ? "/provider/jobs" : "/provider/my-jobs"} className="text-sm text-muted-foreground hover:text-foreground">← {isManager ? "Jobs" : "My jobs"}</Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
              <JobStatusBadge status={job.status} />
              {job.source === "marketplace" ? <Badge tone="accent">Marketplace</Badge> : null}
              {booking && isManager ? <Link href={`/provider/marketplace/bookings/${booking.id}`} className="text-sm text-primary hover:underline">Booking &amp; messages →</Link> : null}
            </div>
            <p className="mt-1 text-lg font-medium">{formatMoney(job.price_cents)}</p>
          </div>
          {isManager ? <Link href={`/provider/jobs/${job.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>Edit job</Link> : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent><StatusControls jobId={job.id} status={job.status as JobStatus} limited={!isManager} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex gap-2"><User className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                {isManager ? <Link href={`/provider/customers/${job.crm_customers?.id}`} className="text-primary hover:underline">{job.crm_customers?.full_name}</Link> : <span>{job.crm_customers?.full_name}</span>}
                {job.crm_customers?.phone ? <a href={`tel:${job.crm_customers.phone}`} className="text-muted-foreground">{job.crm_customers.phone}</a> : null}
              </p>
              <p className="flex gap-2"><CalendarClock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                {job.scheduled_start ? `${formatDateTime(job.scheduled_start, tz)}${job.scheduled_end ? ` – ${formatTime(job.scheduled_end, tz)}` : ""}` : "Not scheduled"}
              </p>
              <p className="flex gap-2"><MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                {addr ? (
                  <span>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.postal_code}
                    {addr.access_notes ? <span className="block text-muted-foreground">{addr.access_notes}</span> : null}
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${addr.line1}, ${addr.city}, ${addr.state} ${addr.postal_code}`)}`} target="_blank" rel="noreferrer" className="block text-primary hover:underline">Directions</a>
                  </span>
                ) : "No address"}
              </p>
              {job.service_categories ? <p className="flex gap-2"><Tag className="size-4 shrink-0 text-muted-foreground" aria-hidden />{job.service_categories.name}</p> : null}
              {job.recurring_schedules ? (
                <p className="flex gap-2"><Repeat className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  Part of {isManager ? <Link href={`/provider/recurring/${job.recurring_schedules.id}`} className="text-primary hover:underline">{job.recurring_schedules.title}</Link> : job.recurring_schedules.title}
                  {job.is_detached ? <span className="text-muted-foreground">(changed by hand)</span> : null}
                </p>
              ) : null}
              {job.description ? <p className="whitespace-pre-wrap rounded-lg bg-muted p-3">{job.description}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <PhotoUploader businessId={business.id} jobId={job.id} />
              {photos?.length ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photos.map((p) => (
                    <li key={p.id} className="relative overflow-hidden rounded-lg border border-border">
                      {urlFor.get(p.storage_path) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URLs from private storage
                        <img src={urlFor.get(p.storage_path)!} alt={p.caption ?? "Job photo"} className="aspect-square w-full object-cover" />
                      ) : <div className="aspect-square bg-muted" />}
                      {p.caption ? <p className="truncate px-2 py-1.5 text-xs">{p.caption}</p> : null}
                      {isManager ? <DeletePhotoButton photoId={p.id} /> : null}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No photos yet. Photos are private to your business.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent><NotesForm jobId={job.id} notes={job.notes} /></CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Assigned to</CardTitle></CardHeader>
            <CardContent>
              {isManager ? (
                team.length > 1 ? <AssigneePicker jobId={job.id} team={team} assigned={assignedIds} />
                  : <p className="text-sm text-muted-foreground">Add employees on the <Link href="/provider/employees" className="text-primary hover:underline">Team</Link> page to assign jobs.</p>
              ) : <p className="text-sm">{assignedNames.join(", ") || "—"}</p>}
            </CardContent>
          </Card>

          {isManager ? <Card>
            <CardHeader><CardTitle className="text-base">Invoice</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {openInvoices.map((i) => (
                <Link key={i.id} href={`/provider/invoices/${i.id}`} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted">
                  <span>Invoice #{i.number} · {formatMoney(i.total_cents)}</span>
                  <InvoiceStatusBadge status={i.status} />
                </Link>
              ))}
              {openInvoices.length === 0 ? (
                <>
                  <p className="text-muted-foreground">Create an invoice for this job&apos;s price. You can edit the lines before sending.</p>
                  <CreateInvoiceButton jobId={job.id} />
                </>
              ) : null}
            </CardContent>
          </Card> : null}

          <Card>
            <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {(history ?? []).map((h) => (
                  <li key={h.id} className="flex justify-between gap-2">
                    <span>{jobStatus(h.to_status).label}</span>
                    <span className="text-muted-foreground">{formatDateTime(h.changed_at, tz)}</span>
                  </li>
                ))}
                <li className="flex justify-between gap-2 text-muted-foreground"><span>Created</span><span>{formatDate(job.created_at, tz)}</span></li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
