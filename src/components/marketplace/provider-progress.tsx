import Link from "next/link";
import { Award, Check, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RANKS, rankProgress } from "@/config/ranks";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { CancellationMeter } from "./cancellation-meter";

/**
 * Provider progress (owner requests 2026-11-14): rank by completed jobs (Bronze 5, Silver 25, Gold 50, Emerald 100),
 * profile strength ("strong profiles win more jobs and happier customers") and the cancellation record.
 */
export async function ProviderProgress({ businessId }: { businessId: string }) {
  const supabase = await createClient();
  const [{ count: completed }, { data: b }, { count: photos }, { count: services }, { data: stripe }, { data: record }] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "completed"),
    supabase.from("businesses").select("logo_path, description, years_experience, home_zip, insured, is_suspended").eq("id", businessId).single(),
    supabase.from("portfolio_photos").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("provider_categories").select("category_id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("stripe_accounts").select("charges_enabled").eq("business_id", businessId).maybeSingle(),
    supabase.rpc("my_cancellation_record"),
  ]);
  const rank = rankProgress(completed ?? 0);
  const steps = [
    { done: Boolean(b?.logo_path), label: "Add your logo or a photo", href: "/provider/marketplace/profile" },
    { done: (b?.description ?? "").trim().length >= 40, label: "Write a few lines about your business", href: "/provider/marketplace/profile" },
    { done: (photos ?? 0) >= 3, label: "Add at least 3 photos of your work", href: "/provider/marketplace/profile" },
    { done: Boolean(b?.home_zip) && (services ?? 0) > 0, label: "Set your area and services", href: "/provider/marketplace/profile" },
    { done: b?.years_experience != null, label: "Add your years in business", href: "/provider/marketplace/profile" },
    { done: Boolean(b?.insured), label: "Show the Insured badge (if you carry insurance)", href: "/provider/marketplace/profile" },
    { done: Boolean(stripe?.charges_enabled), label: "Set up card payments", href: "/provider/payments" },
  ];
  const strength = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
  const strikes = (record as { business?: { count: number; removed: boolean } } | null)?.business ?? { count: 0, removed: false };

  return (
    <Card className="mb-6" data-testid="provider-progress">
      <CardHeader><CardTitle className="flex items-center gap-2"><Award className="size-5 text-primary" aria-hidden /> Your progress</CardTitle></CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3" data-testid="rank-meter">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Rank: {rank.current?.name ?? "Getting started"}</span>
            <span className="text-muted-foreground tabular-nums">{rank.completed} {rank.completed === 1 ? "job" : "jobs"} done</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rank.percent} aria-label="Progress to next rank">
            <div className="h-full rounded-full" style={{ width: `${rank.percent}%`, background: rank.next?.color ?? rank.current?.color ?? "var(--primary)" }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {rank.next ? <><strong className="text-foreground">{rank.toNext} more {rank.toNext === 1 ? "job" : "jobs"}</strong> to reach {rank.next.name}.</> : "You've reached the top rank. Amazing work!"}
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Rank badges">
            {RANKS.map((r) => {
              const earned = rank.completed >= r.at;
              return (
                <li key={r.name} title={`${r.name}: ${r.at} completed jobs`}
                  className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold", earned ? "text-white" : "border-dashed text-muted-foreground")}
                  style={earned ? { background: r.color, borderColor: r.color } : undefined}>
                  <Award className="size-3.5" aria-hidden />{r.name}<span className="font-normal opacity-80">{r.at}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-3" data-testid="profile-strength">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Profile strength</span>
            <span className="tabular-nums text-muted-foreground">{strength}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted"><div className="h-full rounded-full bg-success" style={{ width: `${strength}%` }} /></div>
          <p className="text-xs text-muted-foreground">Strong profiles win more jobs and happier customers.</p>
          <ul className="space-y-1 text-sm">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                {s.done ? <Check className="size-4 shrink-0 text-success" aria-hidden /> : <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                {s.done ? <span className="text-muted-foreground line-through">{s.label}</span> : <Link href={s.href} className="text-primary hover:underline">{s.label}</Link>}
              </li>
            ))}
          </ul>
        </div>

        <CancellationMeter count={strikes.count} blocked={strikes.removed} who="provider" />
      </CardContent>
    </Card>
  );
}
