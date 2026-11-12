import { acceptPaymentTerms } from "@/app/provider/terms-actions";
import { ProviderPaymentTerms } from "@/components/legal/provider-payment-terms";
import { Button } from "@/components/ui/button";

/** Shown to an owner who hasn't accepted the current Provider terms yet. */
export function AcceptPaymentTerms({ businessId }: { businessId: string }) {
  return (
    <section className="mx-auto max-w-2xl space-y-5 rounded-xl border border-border bg-card p-6" data-testid="accept-payment-terms">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Provider terms</h1>
        <p className="mt-1 text-sm text-muted-foreground">Please review and accept these terms to keep using DoneZo.</p>
      </div>
      <div className="text-sm leading-relaxed"><ProviderPaymentTerms /></div>
      <form action={acceptPaymentTerms} className="space-y-4 border-t border-border pt-4">
        <input type="hidden" name="businessId" value={businessId} />
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" name="agree" required className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
          <span>I agree to the Provider terms. I understand I run my own business: I&apos;m responsible for my work and for collecting payment from my customers.</span>
        </label>
        <Button type="submit" size="lg" className="w-full">Accept and continue</Button>
      </form>
    </section>
  );
}
