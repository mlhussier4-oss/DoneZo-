import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { notFound, redirect } from "next/navigation";
import { Lock, MapPin } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { timingLabel, detailLines } from "@/config/marketplace";
import { requireManager } from "@/lib/auth";
import { uuid } from "@/lib/crm/schemas";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { signedRequestPhotos } from "@/lib/marketplace/queries";
import { createClient } from "@/lib/supabase/server";
import { BidForm, WithdrawBidButton } from "./bid-form";

export const metadata: Metadata = { title: "Job request" };

type Detail = {
  id: string; status: string; category_name: string; description: string; details: Record<string, string>;
  timing: string; preferred_date: string | null; zip: string; miles: number; created_at: string; expires_at: string; photos: string[];
  customer: { first_name: string; avatar_path: string | null } | null;
};

export default async function ProviderRequestPage({ params }: PageProps<"/provider/marketplace/requests/[id]">) {
  const { business } = await requireManager();
  if (!business.marketplaceEnabled) redirect("/provider/settings?marketplace=off");
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("marketplace_request_detail", { p_request_id: id });
  if (!data) notFound(); // not in this business's area/services, or no longer open
  const r = data as unknown as Detail;
  const [photos, { data: bid }, { data: booking }] = await Promise.all([
    signedRequestPhotos(r.photos),
    supabase.from("bids").select("id, status, price_cents, included, availability, exclusions, additional_charges, message").eq("request_id", id).eq("business_id", business.id).maybeSingle(),
    supabase.from("bookings").select("id").eq("request_id", id).eq("business_id", business.id).maybeSingle(),
  ]);
  if (booking) redirect(`/provider/marketplace/bookings/${booking.id}`);
  const open = r.status === "open" && new Date(r.expires_at) > new Date();

  return (
    <>
      <div className="mb-6 space-y-2">
        <Link href="/provider/marketplace" className="text-sm text-muted-foreground hover:text-foreground">← Job board</Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{r.category_name}</h1>
          <Badge tone="primary">{timingLabel(r.timing)}{r.preferred_date ? `: ${formatDate(r.preferred_date)}` : ""}</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm"><Avatar path={r.customer?.avatar_path} name={r.customer?.first_name ?? "Customer"} size="sm" /><span>Posted by <strong>{r.customer?.first_name ?? "a customer"}</strong></span></div>
        <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-4" aria-hidden />ZIP {r.zip} · {r.miles} miles from you · posted {formatDateTime(r.created_at, business.timezone)}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <Card>
          <CardHeader><CardTitle>The job</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap">{r.description}</p>
            {Object.keys(r.details ?? {}).length ? (
              <ul className="flex flex-wrap gap-2">{detailLines(r.details).map((v) => <li key={v}><Badge>{v}</Badge></li>)}</ul>
            ) : null}
            {photos.length ? (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((url, i) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                      <img src={url} alt={`Customer photo ${i + 1}`} className="aspect-square w-full rounded-lg object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No photos.</p>}
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="size-4" aria-hidden />The customer&apos;s name, address and phone are shared with you if they accept your bid.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{bid ? "Your bid" : "Send a bid"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {bid && bid.status !== "submitted" ? (
              <Alert tone="info">
                {bid.status === "withdrawn" ? "You withdrew your bid." : bid.status === "closed" ? "The customer chose another provider, or the request closed." : "Your bid was accepted."}
                {" "}({formatMoney(bid.price_cents)})
              </Alert>
            ) : open ? (
              <>
                <BidForm requestId={r.id} bid={bid} />
                {bid ? <WithdrawBidButton bidId={bid.id} /> : null}
              </>
            ) : <Alert tone="info">This request is no longer open for bids.</Alert>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
