import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Cancellation & no-show policy" };

const LEVELS = [
  { n: 1, label: "Yellow", color: "bg-yellow-400", text: "A friendly heads-up." },
  { n: 2, label: "Orange", color: "bg-orange-500", text: "A warning: one more within 6 months and you lose marketplace access." },
  { n: 3, label: "Red", color: "bg-red-600", text: "Marketplace access removed until HomeHire support restores it." },
];

/** Cancellation & no-show policy (owner decisions 2026-11-14/15), on the website and in the app. */
export default function CancellationPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5 [&_a]:text-primary [&_a]:underline">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cancellation &amp; no-show policy</h1>
        <p className="mt-2 text-muted-foreground">HomeHire works because both sides show up. These rules apply to homeowners and pros alike.</p>
      </div>

      <section className="space-y-3">
        <h2>Before a pro confirms: no penalty</h2>
        <ul>
          <li>Homeowners can drop a pro who hasn&apos;t confirmed yet, or let the 5-minute timer run out, and pick another bid.</li>
          <li>A pro who doesn&apos;t confirm in time simply loses the job.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>After a pro confirms: cancellations count</h2>
        <p>Once a pro has confirmed the job and arrival time, cancelling it (by either side) adds one mark to that person&apos;s cancellation record. The record covers the last 6 months.</p>
        <ul className="!ml-0 space-y-2 [&>li]:ml-0 [&>li]:list-none" data-testid="policy-levels">
          {LEVELS.map((l) => (
            <li key={l.n} className="flex items-start gap-3">
              <span className="mt-1 flex gap-1" aria-hidden>{[1, 2, 3].map((i) => <span key={i} className={`h-2 w-6 rounded-full ${i <= l.n ? l.color : "bg-muted"}`} />)}</span>
              <span><strong>{l.n} {l.n === 1 ? "cancellation" : "cancellations"}: {l.label}.</strong> {l.text}</span>
            </li>
          ))}
        </ul>
        <ul>
          <li><strong>Homeowners</strong> with 3 in 6 months can&apos;t post or book jobs until support restores access.</li>
          <li><strong>Pros</strong> with 3 in 6 months are removed from the marketplace (their open bids are withdrawn). Their business tools keep working.</li>
          <li>When support restores access, the record starts again from zero.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>No-shows and cancellations outside the app</h2>
        <ul>
          <li>If the other side cancels in the chat or doesn&apos;t show up, use <strong>Report a problem</strong> on the job and choose “Provider cancelled” or “Customer cancelled”.</li>
          <li>HomeHire support checks every report. Only confirmed reports count on someone&apos;s record, so nobody can be penalized by a false report.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>Once the work has started</h2>
        <p>A job can&apos;t be cancelled in the app after the work has started. Use Report a problem and our team will help.</p>
      </section>

      <section className="space-y-3">
        <h2>Fees</h2>
        <p>HomeHire doesn&apos;t charge cancellation fees. Homeowners pay their pro only after the work is done.</p>
      </section>

      <p className="text-sm text-muted-foreground">Questions? See the <Link href="/faq">FAQ</Link> or <Link href="/help">contact support</Link>. This policy is part of HomeHire&apos;s <Link href="/terms">Terms</Link>.</p>
    </article>
  );
}
