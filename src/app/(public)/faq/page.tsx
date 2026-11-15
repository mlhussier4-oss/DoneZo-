import type { Metadata } from "next";
import Link from "next/link";
import { homeownerFaqs, providerFaqs, type Faq } from "@/content/faq";

export const metadata: Metadata = { title: "Questions & answers", description: "How HomeHire works for homeowners and service pros." };

function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((f) => (
        <details key={f.q} className="group px-4 py-3 sm:px-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium marker:hidden">
            {f.q}<span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="pt-2 text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline">{f.a}</div>
        </details>
      ))}
    </div>
  );
}

/** FAQ (owner request 2026-11-15), on the website and in the app. */
export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-12 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Questions &amp; answers</h1>
        <p className="mt-2 text-muted-foreground">Still stuck? <Link href="/help" className="text-primary underline">Contact support</Link>.</p>
      </div>
      <section aria-labelledby="faq-home" className="space-y-3" data-testid="faq-homeowners">
        <h2 id="faq-home" className="text-xl font-semibold">For homeowners</h2>
        <FaqList items={homeownerFaqs} />
      </section>
      <section aria-labelledby="faq-pros" className="space-y-3" data-testid="faq-pros">
        <h2 id="faq-pros" className="text-xl font-semibold">For service pros</h2>
        <FaqList items={providerFaqs} />
      </section>
    </div>
  );
}
