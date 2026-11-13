import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, Inbox, MapPin, UserCog } from "lucide-react";
import { CategoryIcon } from "@/components/brand/category-icon";
import { Alert } from "@/components/ui/alert";
import { CustomerTag } from "@/components/marketplace/customer-tag";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { timingLabel } from "@/config/marketplace";
import { requireManager } from "@/lib/auth";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { newJobCount } from "@/lib/marketplace/notifications";
import { MarkNewJobsSeen } from "./mark-seen";
import { HideJobButton } from "./hide-button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Marketplace" };

const tabs = [
  { value: "jobs", label: "Jobs near you" },
  { value: "bids", label: "My bids" },
  { value: "bookings", label: "Bookings" },
] as const;

const bidBadge: Record<string, { label: string; tone: "primary" | "success" | "neutral" | "danger" }> = {
  submitted: { label: "Waiting for customer", tone: "primary" },
  accepted: { label: "Won", tone: "success" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
  closed: { label: "Not chosen", tone: "neutral" },
  lapsed: { label: "Not confirmed in time", tone: "danger" },
};

export default async function ProviderMarketplacePage({ searchParams }: PageProps<"/provider/marketplace">) {
  const { user, business } = await requireManager();
  // Server-side guard: CRM-only providers cannot reach marketplace pages even by typing the URL.
  if (!business.marketplaceEnabled) redirect("/provider/settings?marketplace=off");
  const params = await searchParams;
  const tab = tabs.find((t) => t.value === params.tab)?.value ?? "jobs";
  const tz = business.timezone;
  const supabase = await createClient();

  const [{ data: profile }, { count: categoryCount }] = await Promise.all([
    supabase.from("businesses").select("home_zip, is_suspended").eq("id", business.id).single(),
    supabase.from("provider_categories").select("category_id", { count: "exact", head: true }).eq("business_id", business.id),
  ]);
  const profileReady = Boolean(profile?.home_zip) && (categoryCount ?? 0) > 0;

  const feed = tab === "jobs" && profileReady ? (await supabase.rpc("marketplace_feed")).data ?? [] : [];
  // Jobs this business chose to hide (owner request 2026-11-12) stay off the board unless "Hidden jobs" is opened.
  const { data: hiddenRows } = tab === "jobs" ? await supabase.from("hidden_requests").select("request_id").eq("business_id", business.id) : { data: [] };
  const hiddenIds = new Set((hiddenRows ?? []).map((h) => h.request_id));
  const showHidden = tab === "jobs" && params.hidden === "1";
  const unbid = feed.filter((j) => !j.my_bid_status);
  const hiddenJobs = unbid.filter((j) => hiddenIds.has(j.id));
  const openJobs = showHidden ? hiddenJobs : unbid.filter((j) => !hiddenIds.has(j.id));
  const newJobs = tab === "jobs" ? await newJobCount(user.id) : 0;
  const bids = tab === "bids"
    ? (await supabase.from("bids").select("id, status, price_cents, created_at, request_id, service_requests(zip, service_categories(name))")
        .eq("business_id", business.id).order("created_at", { ascending: false }).limit(200)).data ?? []
    : [];
  const bookings = tab === "bookings"
    ? (await supabase.from("bookings").select("id, status, agreed_price_cents, created_at, parent_booking_id, crm_customers(full_name), jobs(status, scheduled_start), service_requests(zip, service_categories(name))")
        .eq("business_id", business.id).order("created_at", { ascending: false }).limit(200)).data ?? []
    : [];

  return (
    <>
      <PageHeader
        title="Marketplace"
        description="Find new customers near you. No fees per lead: you only bid on jobs you want."
        actions={<Link href="/provider/marketplace/profile" className={buttonVariants({ variant: "outline" })}><UserCog /> Marketplace profile</Link>}
      />

      {profile?.is_suspended ? (
        <Alert tone="error" data-testid="marketplace-removed">
          Your marketplace access has been removed under the <Link href="/terms#provider-terms" className="underline">Provider terms</Link>, so you can&apos;t see or bid on new jobs. Your business tools still work. Questions? <Link href="/help" className="underline">Contact support</Link>.
        </Alert>
      ) : null}
      {profileReady && tab === "jobs" ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Getting jobs you don&apos;t want? <Link href="/provider/marketplace/profile" className="font-medium text-primary hover:underline">Turn services on or off</Link>, including Misc / other.
        </p>
      ) : null}
      {!profileReady ? (
        <Alert tone="warning" className="mb-4">
          Set your home ZIP code and the services you offer to start seeing jobs.{" "}
          <Link href="/provider/marketplace/profile" className="font-semibold underline">Complete your profile</Link>
        </Alert>
      ) : null}

      <nav className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-muted p-1 text-sm" aria-label="Marketplace sections">
        {tabs.map((t) => (
          <Link key={t.value} href={`/provider/marketplace?tab=${t.value}`} aria-current={tab === t.value ? "page" : undefined}
            className={cn("shrink-0 rounded-md px-3 py-1.5 font-medium", tab === t.value ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {t.label}{t.value === "jobs" && openJobs.length ? ` (${openJobs.length})` : ""}
          </Link>
        ))}
      </nav>

      {tab === "jobs" ? <MarkNewJobsSeen count={newJobs} /> : null}
      {tab === "jobs" ? (
        !openJobs.length ? (
          <EmptyState icon={Inbox} title={showHidden ? "No hidden jobs" : profileReady ? "No new jobs right now" : "Your job board is empty"}>
            {showHidden ? "Jobs you hide appear here, so you can show them again." : profileReady ? "We'll notify you when a customer near you posts a job for a service you offer." : "Complete your marketplace profile to see local jobs."}
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {openJobs.map((j) => (
              <li key={j.id} className="relative">
                <div className="absolute top-3 right-3 z-10"><HideJobButton requestId={j.id} hidden={showHidden} /></div>
                <Link href={`/provider/marketplace/requests/${j.id}`}>
                  <Card className="flex gap-3 p-4 pr-28 transition-colors hover:border-primary sm:p-5 sm:pr-28">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-cta">
                      <CategoryIcon name={j.category_icon} className="size-6" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{j.category_name}</p>
                        <Badge tone="primary">{timingLabel(j.timing)}{j.preferred_date ? `: ${formatDate(j.preferred_date)}` : ""}</Badge>
                      </div>
                      <p className="line-clamp-2 text-sm">{j.description}</p>
                      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <CustomerTag customer={j.customer} />
                        <span className="flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{j.zip} · {j.miles} mi away</span>
                        {j.photo_count ? <span className="flex items-center gap-1"><Camera className="size-3.5" aria-hidden />{j.photo_count} photos</span> : null}
                        <span>Posted {formatDateTime(j.created_at, tz)}</span>
                      </p>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === "jobs" && (hiddenJobs.length || showHidden) ? (
        <p className="mt-4 text-sm">
          {showHidden
            ? <Link href="/provider/marketplace?tab=jobs" className="text-primary hover:underline">← Back to jobs near you</Link>
            : <Link href="/provider/marketplace?tab=jobs&hidden=1" className="text-muted-foreground hover:text-foreground hover:underline">Hidden jobs ({hiddenJobs.length})</Link>}
        </p>
      ) : null}

      {tab === "bids" ? (
        !bids.length ? <EmptyState icon={Inbox} title="No bids yet">Bids you send appear here with their status.</EmptyState> : (
          <Card className="divide-y divide-border">
            {bids.map((b) => (
              <Link key={b.id} href={`/provider/marketplace/requests/${b.request_id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <p className="font-medium">{b.service_requests?.service_categories?.name} · {b.service_requests?.zip}</p>
                  <p className="text-sm text-muted-foreground">Bid {formatDateTime(b.created_at, tz)}</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="tabular-nums">{formatMoney(b.price_cents)}</span>
                  <Badge tone={bidBadge[b.status].tone}>{bidBadge[b.status].label}</Badge>
                </div>
              </Link>
            ))}
          </Card>
        )
      ) : null}

      {tab === "bookings" ? (
        !bookings.length ? <EmptyState icon={Inbox} title="No bookings yet">When a customer accepts your bid, the booking appears here and in your Jobs and Customers.</EmptyState> : (
          <Card className="divide-y divide-border">
            {bookings.map((b) => (
              <Link key={b.id} href={`/provider/marketplace/bookings/${b.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <p className="font-medium">{b.crm_customers?.full_name} · {b.service_requests?.service_categories?.name}{b.parent_booking_id ? " (repeat visit)" : ""}</p>
                  <p className="text-sm text-muted-foreground">{b.jobs?.scheduled_start ? formatDateTime(b.jobs.scheduled_start, tz) : "Not scheduled yet"}</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="tabular-nums">{formatMoney(b.agreed_price_cents)}</span>
                  <Badge tone={b.status === "active" ? "primary" : b.status === "completed" ? "success" : b.status === "pending" ? "accent" : "danger"} className="capitalize">{b.status === "pending" ? "Confirm now" : b.status === "lapsed" ? "Lost" : b.status}</Badge>
                </div>
              </Link>
            ))}
          </Card>
        )
      ) : null}
    </>
  );
}
