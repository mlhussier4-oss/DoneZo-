import { AlertTriangle } from "lucide-react";

/** Layout for the privacy and terms pages, with the "draft" warning required until a lawyer approves the text. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div role="note" className="mb-8 flex gap-3 rounded-lg border border-warning/40 bg-warning-soft p-4 text-sm">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
        <p><strong>Draft, not yet reviewed by a lawyer.</strong> This page describes how DoneZo works today in plain language. It must be reviewed by an attorney, and the bracketed details filled in, before DoneZo opens to the public.</p>
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>
      <div className="legal mt-8 space-y-6 leading-relaxed [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5 [&_a]:text-primary [&_a]:underline">
        {children}
      </div>
    </article>
  );
}
