import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, FileText, Mail, MapPin, Phone, Plus, Repeat } from "lucide-react";
import { InvoiceStatusBadge, JobStatusBadge, VerificationBadge } from "@/components/crm/status-badges";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePro } from "@/lib/auth";
import { frequencyLabels, paymentMethodLabel } from "@/lib/crm/labels";
import { uuid } from "@/lib/crm/schemas";
import { splitByNow } from "@/lib/crm/time";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { AddAddressForm, AddNoteForm } from "../customer-forms";
import { AddressActions, ArchiveButton, DeleteNoteButton } from "./customer-buttons";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params }: PageProps<"/provider/customers/[id]">) {
  const { business } = await requirePro();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const tz = business.timezone;

  const supabase = await createClient();
  const { data: c } = await supabase
    .from("crm_customers")
    .select("*, crm_customer_addresses(*), crm_customer_notes(id, body, created_at)")
    .eq("id", id)
    .single();
  if (!c) notFound();

  const [{ data: jobs }, { data: schedules }, { data: invoices }, { data: payments }] = await Promise.all([
    supabase.from("jobs").select("id, title, status, scheduled_start, price_cents").eq("customer_id", id)
      .order("scheduled_start", { ascending: false, nullsFirst: true }).limit(100),
    supabase.from("recurring_schedules").select("id, title, frequency, interval_days, price_cents, status, start_time")
      .eq("customer_id", id).neq("status", "canceled").order("created_at"),
    supabase.from("invoices").select("id, number, status, total_cents, amount_paid_cents, issue_date").eq("customer_id", id)
      .order("number", { ascending: false }).limit(50),
    supabase.from("payment_records").select("id, amount_cents, method, verification, received_on").eq("customer_id", id)
      .order("received_on", { ascending: false }).limit(50),
  ]);

  const { upcoming, rest: past } = splitByNow(jobs ?? [], (j) => j.scheduled_start, (j) => ["completed", "canceled"].includes(j.status));
  const addresses = [...(c.crm_customer_addresses ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  const notes = [...(c.crm_customer_notes ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const totalPaid = (payments ?? []).reduce((s, p) => s + p.amount_cents, 0);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link href="/provider/customers" className="text-sm text-muted-foreground hover:text-foreground">← Customers</Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{c.full_name}</h1>
            {c.is_archived ? <Badge>Archived</Badge> : null}
            {c.source === "marketplace" ? <Badge tone="accent">Marketplace</Badge> : null}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {c.phone ? <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 hover:text-foreground"><Phone className="size-4" aria-hidden />{c.phone}</a> : null}
            {c.email ? <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-foreground"><Mail className="size-4" aria-hidden />{c.email}</a> : null}
            <span>Customer since {formatDate(c.created_at, tz)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/provider/jobs/new?customer=${c.id}`} className={buttonVariants({ size: "sm" })}><Plus /> New job</Link>
          <Link href={`/provider/recurring/new?customer=${c.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}><Repeat /> Recurring service</Link>
          <Link href={`/provider/invoices/new?customer=${c.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}><FileText /> Invoice</Link>
          <Link href={`/provider/customers/${c.id}/edit`} className={buttonVariants({ size: "sm", variant: "outline" })}>Edit</Link>
          <ArchiveButton customerId={c.id} archived={c.is_archived} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Upcoming</CardTitle></CardHeader>
            <CardContent>
              {upcoming.length ? (
                <ul className="divide-y divide-border">
                  {upcoming.slice(0, 8).map((j) => (
                    <li key={j.id}>
                      <Link href={`/provider/jobs/${j.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-primary">
                        <span className="flex items-center gap-2"><CalendarClock className="size-4 text-muted-foreground" aria-hidden />{formatDateTime(j.scheduled_start, tz)} · {j.title}</span>
                        <span className="text-sm">{formatMoney(j.price_cents)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
              {upcoming.length > 8 ? <p className="mt-2 text-sm text-muted-foreground">+ {upcoming.length - 8} more on the calendar</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Recurring services</CardTitle></CardHeader>
            <CardContent>
              {schedules?.length ? (
                <ul className="divide-y divide-border">
                  {schedules.map((s) => (
                    <li key={s.id}>
                      <Link href={`/provider/recurring/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-primary">
                        <span>
                          {s.title} · {s.frequency === "custom" ? `Every ${s.interval_days} days` : frequencyLabels[s.frequency as keyof typeof frequencyLabels]}
                        </span>
                        <span className="flex items-center gap-2 text-sm">
                          {formatMoney(s.price_cents)}
                          {s.status === "paused" ? <Badge tone="warning">Paused</Badge> : <Badge tone="success">Active</Badge>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No recurring services.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Job history</CardTitle></CardHeader>
            <CardContent>
              {past.length ? (
                <ul className="divide-y divide-border">
                  {past.map((j) => (
                    <li key={j.id}>
                      <Link href={`/provider/jobs/${j.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 hover:text-primary">
                        <span>{j.scheduled_start ? formatDate(j.scheduled_start, tz) : "Unscheduled"} · {j.title}</span>
                        <span className="flex items-center gap-2 text-sm">{formatMoney(j.price_cents)} <JobStatusBadge status={j.status} /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No past jobs yet.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
            <CardContent>
              {invoices?.length ? (
                <ul className="divide-y divide-border">
                  {invoices.map((i) => (
                    <li key={i.id}>
                      <Link href={`/provider/invoices/${i.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:text-primary">
                        <span>Invoice #{i.number} · {formatDate(i.issue_date)}</span>
                        <span className="flex items-center gap-2 text-sm">{formatMoney(i.total_cents)} <InvoiceStatusBadge status={i.status} /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No invoices yet.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
            <CardContent>
              {payments?.length ? (
                <>
                  <ul className="divide-y divide-border">
                    {payments.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <span>{formatDate(p.received_on)} · {paymentMethodLabel(p.method)}</span>
                        <span className="flex items-center gap-2 text-sm">{formatMoney(p.amount_cents)} <VerificationBadge verification={p.verification} /></span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-muted-foreground">Total received: <strong className="text-foreground">{formatMoney(totalPaid)}</strong></p>
                </>
              ) : <p className="text-sm text-muted-foreground">No payments recorded.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {c.service_preferences ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Service preferences</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{c.service_preferences}</p></CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle className="text-base">Addresses</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {addresses.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="flex-1">
                      <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
                      <p className="text-muted-foreground">{a.city}, {a.state} {a.postal_code}</p>
                      {a.access_notes ? <p className="mt-1 text-muted-foreground">{a.access_notes}</p> : null}
                    </div>
                    {a.is_primary ? <Badge tone="primary">Primary</Badge> : null}
                  </div>
                  <div className="mt-2 flex justify-end"><AddressActions customerId={c.id} addressId={a.id} isPrimary={a.is_primary} /></div>
                </div>
              ))}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-primary">+ Add an address</summary>
                <div className="mt-3"><AddAddressForm customerId={c.id} /></div>
              </details>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <AddNoteForm customerId={c.id} />
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-lg bg-muted p-3 text-sm">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDateTime(n.created_at, tz)}</span>
                      <DeleteNoteButton noteId={n.id} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
