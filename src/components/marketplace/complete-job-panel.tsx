"use client";

import { useState, useTransition } from "react";
import { Banknote, CheckCircle2, CreditCard, Landmark, Smartphone } from "lucide-react";
import { completeJob } from "@/app/provider/marketplace/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type Method = "card" | "cash" | "venmo" | "cash_app" | "check";

/**
 * Owner request 2026-11-12: one "Mark job completed" button, then "Form of payment".
 * Card sends the invoice with a pay-by-card link; anything else records it as paid and completes the job.
 */
export function CompleteJobPanel({ bookingId, amountCents, cardsOn }: { bookingId: string; amountCents: number; cardsOn: boolean }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method | null>(null);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();
  const [pending, start] = useTransition();

  const options: { value: Method; label: string; hint: string; icon: typeof Banknote }[] = [
    ...(cardsOn ? [{ value: "card" as const, label: "Card", hint: "Sends a secure pay-by-card link", icon: CreditCard }] : []),
    { value: "cash", label: "Cash", hint: "Paid in person", icon: Banknote },
    { value: "venmo", label: "Venmo", hint: "Already paid", icon: Smartphone },
    { value: "cash_app", label: "Cash App", hint: "Already paid", icon: Smartphone },
    { value: "check", label: "Check", hint: "Already paid", icon: Landmark },
  ];

  if (done) return <Alert tone="success" data-testid="complete-done">{done}</Alert>;

  if (!open) {
    return (
      <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
        <CheckCircle2 /> Mark job completed
      </Button>
    );
  }

  const submit = () => start(async () => {
    if (!method) return;
    const r = await completeJob(bookingId, method);
    if (r.error) { setError(r.error); return; }
    setDone(method === "card"
      ? "Done! The customer has the invoice and a secure card payment link in your chat. The job completes when Stripe confirms the payment."
      : "Done! Marked paid, the job is completed, and the customer has their invoice and an invitation to rate you.");
  });

  return (
    <div className="space-y-4" data-testid="form-of-payment">
      <div>
        <p className="text-lg font-semibold">Form of payment</p>
        <p className="text-sm text-muted-foreground">How is the customer paying the {formatMoney(amountCents)}?</p>
      </div>
      <div role="radiogroup" aria-label="Form of payment" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={method === o.value}
            onClick={() => { setMethod(o.value); setError(undefined); }}
            className={cn(
              "flex min-h-16 cursor-pointer flex-col items-start gap-0.5 rounded-lg border p-3 text-left",
              method === o.value ? "border-primary bg-primary text-white" : "border-input bg-card hover:bg-muted",
            )}
          >
            <span className="flex items-center gap-2 font-semibold"><o.icon className="size-4" aria-hidden />{o.label}</span>
            <span className={cn("text-xs", method === o.value ? "text-white/80" : "text-muted-foreground")}>{o.hint}</span>
          </button>
        ))}
      </div>
      {!cardsOn ? <p className="text-xs text-muted-foreground">Card payments appear here once you connect Stripe under Payments.</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" className="flex-1" disabled={!method || pending} onClick={submit}>
          {pending ? "Finishing…" : method === "card" ? "Send invoice & card link" : method ? "Mark paid & complete job" : "Choose a form of payment"}
        </Button>
        <Button size="lg" variant="ghost" disabled={pending} onClick={() => { setOpen(false); setMethod(null); }}>Cancel</Button>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
