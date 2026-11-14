import type { Metadata } from "next";
import Link from "next/link";
import { LiveRefresh } from "@/components/marketplace/live-refresh";
import { CustomerTag } from "@/components/marketplace/customer-tag";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { detailLines, timingLabel } from "@/config/marketplace";
import { requireRole } from "@/lib/auth";
import { getActiveCategories } from "@/lib/data/categories";
import { formatDateTime, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Marketplace live" };

type Job = {
  id: string; status: string; zip: string; description: string; details: Record<string, string>; timing: string;
  created_at: string; expires_at: string; category: string; customer: unknown; photos: number;
  bids: { business: string; price_cents: number; status: string; created_at: string; verified: boolean }[];
  booking: { status: string; business: string; price_cents: number; confirm_by: string | null; completed_at: string | null } | null;
};

const TZ = "America/Chicago";
const FILTERS = [
  { value: "active", label: "Open + booked" },
  { value: "open", label: "Open (taking bids)" },
  { value: "booked", label: "Booked" },
  { value: "all", label: "All" },
] as const;

function jobState(j: Job): { label: string; tone: "primary" | "warning" | "success" | "neutral" | "danger" } {
  if (j.booking?.status === "completed") return { label: "Done", tone: "success" };
  if (j.booking?.status === "active") return { label: `Booked: ${j.booking.business}`, tone: "primary" };
  if (j.booking?.status === "pending") return { label: `Waiting for ${j.booking.business} to confirm`, tone: "warning" };
  if (j.status === "open" && new Date(j.expires_at) > new Date()) return { label: "Taking bids", tone: "warning" };
  if (j.status === "canceled") return { label: "Canceled", tone: "danger" };
  return { label: j.status === "open" ? "Expired" : j.status, tone: "neutral" };
}

/** Owner request 2026-11-14: every job on HomeHire with all its bids, refreshing by itself. Admin only (checked in the database too). */
export default async function AdminMarketplaceLivePage({ searchParams }: PageProps<"/admin/marketplace">) {
  await requireRole("admin");
  const params = await searchParams;
  const status = FILTERS.find((f) => f.value === params.status)?.value ?? "active";
  const category = typeof params.service === "string" && /^[0-9a-f-]{36}$/.test(params.service) ? params.service : null;
  const zip = typeof params.zip === "string" && /^\d{1,5}$/.test(params.zip) ? params.zip : null;
  const [categories, { data }] = await Promise.all([
    getActiveCategories(),
    (await createClient()).rpc("admin_marketplace_live", { p_status: status, p_category: category as unknown as string, p_zip: zip as unknown as string }),
  ]);
  const jobs = (data ?? []) as unknown as Job[];
  const bidCount = jobs.reduce((s, j) => s + j.bids.length, 0);
  const href = (s: string) => `/admin/marketplace?status=${s}${category ? `&service=${category}` : ""}${zip ? `&zip=${zip}` : ""}`;

  return (
    <>
      <LiveRefresh everyMs={10000} />
      <PageHeader title="Marketplace live" description="Every job posted on HomeHire and every bid on it. Updates by itself every 10 seconds. Only you can see bid prices side by side." />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <nav className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 text-sm" aria-label="Job status">
          {FILTERS.map((f) => (
            <Link key={f.value} href={href(f.value)} aria-current={status === f.value ? "page" : undefined}
              className={cn("rounded-md px-3 py-1.5 font-medium", status === f.value ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground")}>{f.label}</Link>
          ))}
        </nav>
        <form className="flex flex-wrap items-end gap-2 text-sm" action="/admin/marketplace">
          <input type="hidden" name="status" value={status} />
          <label className="flex flex-col gap-1">Service
            <select name="service" defaultValue={category ?? ""} className="h-10 rounded-lg border border-input bg-card px-2">
              <option value="">All services</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">ZIP starts with
            <input name="zip" defaultValue={zip ?? ""} inputMode="numeric" maxLength={5} className="h-10 w-28 rounded-lg border border-input bg-card px-2" />
          </label>
          <button type="submit" className="h-10 cursor-pointer rounded-lg bg-cta px-4 font-semibold text-cta-foreground">Filter</button>
        </form>
      </div>
      <p className="mb-3 text-sm text-muted-foreground" data-testid="live-summary">{jobs.length} jobs · {bidCount} bids</p>

      <ul className="space-y-3" data-testid="live-jobs">
        {jobs.map((j) => {
          const state = jobState(j);
          return (
            <li key={j.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold">{j.category} <span className="font-normal text-muted-foreground">· ZIP {j.zip} · {timingLabel(j.timing)}</span></p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <CustomerTag customer={j.customer} />
                      <span>Posted {formatDateTime(j.created_at, TZ)}</span>
                      <span>{j.photos} {j.photos === 1 ? "photo" : "photos"}</span>
                    </div>
                  </div>
                  <Badge tone={state.tone}>{state.label}</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm">{j.description}</p>
                {detailLines(j.details).length ? <p className="mt-1 text-xs text-muted-foreground">{detailLines(j.details).join(" · ")}</p> : null}
                <div className="mt-3 rounded-lg border border-border">
                  {j.bids.length ? (
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs text-muted-foreground"><tr><th className="px-3 py-1.5 font-medium">Provider</th><th className="px-3 py-1.5 text-right font-medium">Bid</th><th className="px-3 py-1.5 font-medium">Status</th></tr></thead>
                      <tbody>
                        {j.bids.map((b, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-1.5">{b.business}{b.verified ? <Badge tone="success" className="ml-2">Verified</Badge> : null}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{formatMoney(b.price_cents)}</td>
                            <td className="px-3 py-1.5 capitalize">{b.status === "submitted" ? "waiting" : b.status === "closed" ? "not chosen" : b.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p className="px-3 py-2 text-sm text-muted-foreground">No bids yet.</p>}
                </div>
                {j.booking ? <p className="mt-2 text-xs text-muted-foreground">Booking: {j.booking.business} at {formatMoney(j.booking.price_cents)} · {j.booking.status}{j.booking.completed_at ? ` · done ${formatDateTime(j.booking.completed_at, TZ)}` : ""}</p> : null}
              </Card>
            </li>
          );
        })}
        {!jobs.length ? <li className="text-sm text-muted-foreground">No jobs match.</li> : null}
      </ul>
    </>
  );
}
