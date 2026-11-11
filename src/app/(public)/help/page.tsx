import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { brand } from "@/config/brand";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { supportCategoryLabel } from "@/lib/support/categories";
import { createClient } from "@/lib/supabase/server";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Help & support" };

const faqs: { group: string; items: { q: string; a: React.ReactNode }[] }[] = [
  {
    group: "Customers",
    items: [
      { q: "Does it cost anything to post a job?", a: "No. Posting a job and accepting a bid are free, and you never enter a card to do either. You pay the provider you choose after the work, by card through DoneZo or another way you agree on." },
      { q: "Who can see my address?", a: "Providers see your ZIP code, description and photos while bidding. Only the provider whose bid you accept sees your name and full address, and only then can you message each other." },
      { q: "Can providers see each other's bids?", a: "No. Bids are sealed: each provider only sees their own." },
      { q: "Something went wrong with my job.", a: "Message your provider from the booking first. If that doesn't fix it, use “Report a problem” on the booking or the form below." },
    ],
  },
  {
    group: "Providers",
    items: [
      { q: "What does DoneZo cost?", a: "DoneZo Basic is $9.99 a month for the marketplace. DoneZo Pro is $19.99 a month for the marketplace plus business tools for all your customers, including your whole team. When a customer pays you by card through DoneZo, DoneZo keeps 10% and Stripe charges its processing fee. No DoneZo fee on cash, Venmo, Cash App or check." },
      { q: "Do I have to use the marketplace?", a: "No. On DoneZo Pro you can use DoneZo just to run your business, and switch the marketplace on or off in Business settings at any time without losing anything." },
      { q: "Can I switch plans?", a: <>Yes, from <Link href="/provider/plan">Plan &amp; billing</Link>. Upgrading to Pro starts right away and you pay only the difference for the rest of the month. Switching to Basic takes effect at your next billing date; your records are kept.</> },
      { q: "When does card money reach my bank?", a: "Stripe pays out to your bank on its own schedule, usually a few business days. Your Payments page shows each payout's status." },
      { q: "How do I add employees?", a: <>On DoneZo Pro, open <Link href="/provider/employees">Team</Link> and invite them by email. Employees only see the jobs you assign them.</> },
      { q: "How do I cancel my subscription?", a: <>Go to <Link href="/provider/plan">Plan &amp; billing</Link> and choose “Manage billing”. Your records stay in DoneZo.</> },
    ],
  },
];

async function SupportPanel() {
  const user = await getCurrentUser();
  if (!user || user.role === "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contact support</CardTitle>
          <CardDescription>{user ? "Admins answer requests in the admin area." : "Sign in so we can see your account and reply to you securely."}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          {user ? <Link href="/admin/reports" className={buttonVariants()}>Support inbox</Link> : <Link href="/login?next=/help" className={buttonVariants()}>Sign in to contact support</Link>}
          {!user && brand.supportEmail ? <span className="text-muted-foreground">Can&apos;t sign in? Email <a href={`mailto:${brand.supportEmail}`} className="text-primary underline">{brand.supportEmail}</a>.</span> : null}
        </CardContent>
      </Card>
    );
  }
  const supabase = await createClient();
  const { data: mine } = await supabase.from("support_reports").select("id, category, subject, message, status, admin_note, created_at, resolved_at")
    .eq("reporter_id", user.id).order("created_at", { ascending: false }).limit(50);
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Contact support</CardTitle>
          <CardDescription>We reply here and send you a notification.</CardDescription>
        </CardHeader>
        <CardContent><ContactForm /></CardContent>
      </Card>
      <section id="my-requests" className="mt-8 scroll-mt-20">
        <h2 className="mb-3 text-lg font-semibold">My requests</h2>
        {mine?.length ? (
          <Card className="divide-y divide-border">
            {mine.map((r) => (
              <div key={r.id} className="space-y-1.5 px-4 py-3 sm:px-5">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {r.subject ?? supportCategoryLabel(r.category)}
                  <Badge tone={r.status === "open" ? "warning" : "success"}>{r.status === "open" ? "Waiting for reply" : "Answered"}</Badge>
                </p>
                <p className="text-xs text-muted-foreground">{supportCategoryLabel(r.category)} · sent {formatDateTime(r.created_at, "America/Chicago")}</p>
                <p className="line-clamp-3 text-sm whitespace-pre-wrap">{r.message}</p>
                {r.admin_note ? <p className="rounded-lg bg-primary-soft p-3 text-sm whitespace-pre-wrap"><span className="font-medium">DoneZo support: </span>{r.admin_note}</p> : null}
              </div>
            ))}
          </Card>
        ) : <p className="text-sm text-muted-foreground">You haven&apos;t contacted support yet.</p>}
      </section>
    </>
  );
}

export default function HelpPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_26rem]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help &amp; support</h1>
        <p className="mt-2 text-muted-foreground">Answers to common questions, and a way to reach our team.</p>
        {faqs.map((g) => (
          <section key={g.group} className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">{g.group}</h2>
            <div className="divide-y divide-border rounded-xl border border-border bg-card">
              {g.items.map((f) => (
                <details key={f.q} className="group px-4 py-3 sm:px-5">
                  <summary className="cursor-pointer list-none font-medium marker:hidden group-open:text-primary">{f.q}</summary>
                  <p className="mt-2 text-sm text-muted-foreground [&_a]:text-primary [&_a]:underline">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
        <p className="mt-8 text-sm text-muted-foreground">See also our <Link href="/terms" className="text-primary underline">Terms of service</Link> and <Link href="/privacy" className="text-primary underline">Privacy policy</Link>.</p>
      </div>
      <div>
        <Suspense fallback={<Card className="h-96 animate-pulse" />}>
          <SupportPanel />
        </Suspense>
      </div>
    </div>
  );
}
