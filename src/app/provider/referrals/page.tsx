import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireManager } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { formatDate, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { CopyLink } from "./copy-link";

export const metadata: Metadata = { title: "Refer & earn" };

/** Owner decision 2026-11-14: every 2 providers who sign up with your link and pay = 1 free month of your plan. */
export default async function ReferralsPage() {
  const { business } = await requireManager();
  const supabase = await createClient();
  const [{ data: b }, { data: referred }, { data: rewards }] = await Promise.all([
    supabase.from("businesses").select("referral_code").eq("id", business.id).single(),
    supabase.rpc("my_referrals"),
    supabase.from("referral_rewards").select("id, amount_cents, plan_name, status, created_at").eq("business_id", business.id).order("created_at", { ascending: false }),
  ]);
  const url = `${publicEnv.siteUrl()}/signup/provider?ref=${b?.referral_code ?? ""}`;
  const list = referred ?? [];
  const paying = list.filter((r) => r.paying).length;
  const waiting = list.filter((r) => r.paying && !r.counted).length; // paying, not yet used toward a free month
  const months = (rewards ?? []).length;
  const toNext = 2 - (waiting % 2);

  return (
    <>
      <PageHeader title="Refer & earn" description="Get HomeHire free by inviting other service pros." />
      <div className="grid max-w-3xl gap-6">
        <Card className="border-cta">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Gift className="size-5 text-primary" aria-hidden /> 2 paying referrals = 1 free month</CardTitle>
            <CardDescription>
              Share your link. A referral counts once that provider is actually charged for their subscription (after any free month), on any plan: Basic, Pro or Priority. Every 2 that count = 1 free month of the plan you&apos;re on, whichever it is.
              There&apos;s no limit.
            </CardDescription>
          </CardHeader>
          <CardContent><CopyLink url={url} /></CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3" data-testid="referral-stats">
          <Card><CardContent className="pt-6"><p className="text-3xl font-bold">{list.length}</p><p className="text-sm text-muted-foreground">signed up with your link</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-3xl font-bold">{paying}</p><p className="text-sm text-muted-foreground">paying providers</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-3xl font-bold">{months}</p><p className="text-sm text-muted-foreground">free {months === 1 ? "month" : "months"} earned</p></CardContent></Card>
        </div>
        <p className="text-sm" data-testid="referral-next">
          <strong>{toNext} more paying {toNext === 1 ? "referral" : "referrals"}</strong> until your next free month.
        </p>

        {months ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Free months</CardTitle><CardDescription>Added as a credit to your HomeHire bill; Stripe uses it automatically on your next payment(s).</CardDescription></CardHeader>
            <CardContent>
              <ul className="divide-y divide-border text-sm">
                {(rewards ?? []).map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2">
                    <span>1 month of {r.plan_name} · {formatMoney(r.amount_cents)} · {formatDate(r.created_at)}</span>
                    {r.status === "applied" ? <Badge tone="success">Credited</Badge> : <Badge tone="warning">Processing</Badge>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader><CardTitle className="text-base">Providers you referred</CardTitle></CardHeader>
          <CardContent>
            {list.length ? (
              <ul className="divide-y divide-border text-sm" data-testid="referral-list">
                {list.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2">
                    <span className="font-medium">{r.business_name}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      Joined {formatDate(r.signed_up_at)}
                      {r.paying ? <Badge tone="success">Paying</Badge> : <Badge>Not paying yet</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No one yet. Share your link with other pros you know: landscapers, cleaners, movers, handymen.</p>}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">Free months are account credit with no cash value. Referrals must be real, separate businesses; see the <a href="/terms#referrals" className="underline">Terms</a>.</p>
      </div>
    </>
  );
}
