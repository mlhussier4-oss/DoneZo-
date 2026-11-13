import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeCheck, MapPin } from "lucide-react";
import { ProviderAvatar } from "@/components/marketplace/provider-avatar";
import { Rating } from "@/components/marketplace/stars";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { paymentMethodName } from "@/config/marketplace";
import { uuid } from "@/lib/crm/schemas";
import { formatDate } from "@/lib/format";
import { publicMediaUrl } from "@/lib/marketplace/queries";
import type { ProviderProfile } from "@/lib/marketplace/types";
import { createPublicClient } from "@/lib/supabase/public";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Provider profile" };

async function Profile({ params }: { params: PageProps<"/pros/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const { data } = await createPublicClient().rpc("get_provider_profile", { p_business_id: id });
  if (!data) notFound();
  const p = data as unknown as ProviderProfile;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <ProviderAvatar name={p.name} logoPath={p.logo_path} size="lg" />
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{p.name}</h1>
            {p.verified ? <Badge tone="success"><BadgeCheck className="size-3.5" aria-hidden />Verified by HomeHire</Badge> : null}
          </div>
          <Rating rating={p.stats.rating} count={p.stats.review_count} />
          <p className="text-sm text-muted-foreground">
            {p.stats.completed_jobs} {p.stats.completed_jobs === 1 ? "job" : "jobs"} completed on HomeHire
            {p.years_experience ? ` · ${p.years_experience} years in business` : ""}
          </p>
          {p.home_zip ? <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-4" aria-hidden />Serves within {p.service_radius_miles} miles of {p.home_zip}</p> : null}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_16rem]">
        <div className="space-y-6">
          {p.description ? <Card><CardContent><p className="whitespace-pre-wrap">{p.description}</p></CardContent></Card> : null}
          {p.portfolio.length ? (
            <Card>
              <CardHeader><CardTitle>Past work</CardTitle></CardHeader>
              <CardContent>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {p.portfolio.map((ph) => (
                    <li key={ph.path}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- public portfolio photo */}
                      <img src={publicMediaUrl(ph.path)!} alt={ph.caption ?? `Work by ${p.name}`} className="aspect-square w-full rounded-lg object-cover" />
                      {ph.caption ? <p className="mt-1 text-xs text-muted-foreground">{ph.caption}</p> : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader><CardTitle>Reviews</CardTitle></CardHeader>
            <CardContent>
              {p.reviews.length ? (
                <ul className="space-y-4">
                  {p.reviews.map((r, i) => (
                    <li key={i} className="space-y-1 border-b border-border pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <Rating rating={r.rating} count={1} className="[&>span:last-child]:hidden" />
                        <span className="text-xs text-muted-foreground">{r.author} · {formatDate(r.created_at, "America/Chicago")}</span>
                      </div>
                      {r.comment ? <p className="text-sm">{r.comment}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No reviews yet. Reviews come only from customers who booked through HomeHire.</p>}
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Services</CardTitle></CardHeader>
            <CardContent><ul className="space-y-1 text-sm">{p.categories.map((c) => <li key={c}>{c}</li>)}</ul></CardContent>
          </Card>
          {p.accepted_payment_methods.length ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Accepts</CardTitle></CardHeader>
              <CardContent><ul className="space-y-1 text-sm">{p.accepted_payment_methods.map((m) => <li key={m}>{paymentMethodName(m)}</li>)}</ul></CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export default function ProviderProfilePage({ params }: PageProps<"/pros/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-4xl animate-pulse px-4 py-10"><div className="h-full rounded-lg bg-muted" /></div>}>
      <Profile params={params} />
    </Suspense>
  );
}
