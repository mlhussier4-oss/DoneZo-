import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const SOURCE_PERIODS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 0, label: "All time" },
] as const;
export const parseSourcePeriod = (v: unknown): number => (SOURCE_PERIODS.some((p) => String(p.value) === v) ? Number(v) : 30);

type Row = { channel: string; signups: number; customers: number; posted: number; providers: number; subscribed: number; paying: number };
type Campaign = { campaign: string; source: string | null; medium: string | null; signups: number; customers: number; posted: number; providers: number; paying: number };
type Sources = { days: number; total: number; channels: Row[]; campaigns: Campaign[] };

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "–");

/**
 * Where sign-ups come from (owner request 2026-11-28): each account's first visit (ad tags, referring site,
 * referral code) grouped into plain-English channels, with how many homeowners went on to post a job and how many
 * pros subscribed and paid, so ad money can be judged on real results.
 */
export async function SignupSourcesCard({ days, revParam }: { days: number; revParam?: string }) {
  const { data, error } = await (await createClient()).rpc("admin_signup_sources", { p_days: days });
  if (error || !data) throw new Error("Could not load sign-up sources.");
  const d = data as unknown as Sources;
  const href = (v: number) => `/admin?src=${v}${revParam ? `&rev=${revParam}` : ""}`;

  return (
    <Card className="mt-4" data-testid="signup-sources">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Where sign-ups come from</CardTitle>
            <CardDescription>
              {d.total} {d.total === 1 ? "sign-up" : "sign-ups"} {days ? `in the last ${days} days` : "so far"}, by how they first found HomeHire.
              Add <code className="rounded bg-muted px-1 text-xs">?utm_source=…&amp;utm_campaign=…</code> to ad and flyer links to see each one here.
            </CardDescription>
          </div>
          <nav aria-label="Sign-up period" className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
            {SOURCE_PERIODS.map((p) => (
              <Link key={p.value} href={href(p.value)} scroll={false} aria-current={p.value === days ? "page" : undefined}
                className={cn("rounded-md px-3 py-1.5 font-medium", p.value === days ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {d.channels.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm" data-testid="signup-channels">
              <thead>
                <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th scope="col" className="py-2 pr-3 font-semibold">Channel</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Sign-ups</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Homeowners</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Posted a job</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Pros</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Subscribed</th>
                  <th scope="col" className="py-2 pl-3 text-right font-semibold">Paying</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {d.channels.map((r) => (
                  <tr key={r.channel} className="border-b border-border last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left font-medium">{r.channel}</th>
                    <td className="px-3 py-2 text-right font-semibold">{r.signups}</td>
                    <td className="px-3 py-2 text-right">{r.customers}</td>
                    <td className="px-3 py-2 text-right">{r.posted} <span className="text-xs text-muted-foreground">({pct(r.posted, r.customers)})</span></td>
                    <td className="px-3 py-2 text-right">{r.providers}</td>
                    <td className="px-3 py-2 text-right">{r.subscribed}</td>
                    <td className="py-2 pl-3 text-right">{r.paying} <span className="text-xs text-muted-foreground">({pct(r.paying, r.providers)})</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted-foreground">No sign-ups in this period yet.</p>}

        {d.campaigns.length ? (
          <div>
            <p className="mb-2 text-sm font-semibold">Campaigns (from utm_campaign)</p>
            <ul className="divide-y divide-border text-sm" data-testid="signup-campaigns">
              {d.campaigns.map((c) => (
                <li key={`${c.campaign}-${c.source}-${c.medium}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <span className="font-medium">{c.campaign}</span>
                    <span className="text-xs text-muted-foreground"> · {[c.source, c.medium].filter(Boolean).join(" / ") || "no source"}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    <strong className="text-foreground">{c.signups}</strong> sign-ups · {c.posted} posted a job · {c.paying} paying pros
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
