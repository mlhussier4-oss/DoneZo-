import Link from "next/link";
import { CategoryIcon } from "@/components/brand/category-icon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { timingLabel } from "@/config/marketplace";
import { formatDate } from "@/lib/format";

export type RequestRow = {
  id: string;
  status: string;
  timing: string;
  created_at: string;
  expires_at: string;
  service_categories: { name: string; icon: string } | null;
  bids: { status: string }[];
  bookings: { status: string } | null;
};

export function requestState(r: RequestRow): { label: string; tone: "primary" | "success" | "neutral" | "danger" | "warning" } {
  if (r.status === "open" && new Date(r.expires_at) < new Date()) return { label: "Expired", tone: "neutral" };
  if (r.status === "open") {
    const n = r.bids.filter((b) => b.status === "submitted").length;
    return n ? { label: `${n} ${n === 1 ? "bid" : "bids"}`, tone: "warning" } : { label: "Waiting for bids", tone: "primary" };
  }
  if (r.status === "booked") {
    if (r.bookings?.status === "completed") return { label: "Completed", tone: "success" };
    if (r.bookings?.status === "canceled") return { label: "Booking canceled", tone: "danger" };
    return { label: "Booked", tone: "success" };
  }
  return r.status === "canceled" ? { label: "Canceled", tone: "danger" } : { label: "Expired", tone: "neutral" };
}

export function RequestList({ rows }: { rows: RequestRow[] }) {
  return (
    <Card className="divide-y divide-border">
      {rows.map((r) => {
        const s = requestState(r);
        return (
          <Link key={r.id} href={`/customer/requests/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted sm:px-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <CategoryIcon name={r.service_categories?.icon ?? "wrench"} className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{r.service_categories?.name}</p>
              <p className="text-sm text-muted-foreground">Posted {formatDate(r.created_at, "America/Chicago")} · {timingLabel(r.timing)}</p>
            </div>
            <Badge tone={s.tone}>{s.label}</Badge>
          </Link>
        );
      })}
    </Card>
  );
}

export const requestListSelect = "id, status, timing, created_at, expires_at, service_categories(name, icon), bids(status), bookings(status)";
