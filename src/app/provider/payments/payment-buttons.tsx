"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { checkStripeStatus, connectStripe, refundCardPayment } from "./actions";

export function ConnectStripeButton({ label }: { label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="space-y-2">
      <Button disabled={pending} onClick={() => start(async () => setError((await connectStripe())?.error))}>{pending ? "Opening Stripe…" : label}</Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

export function CheckStatusButton() {
  const [pending, start] = useTransition();
  return <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => checkStripeStatus())}>{pending ? "Checking…" : "Check status"}</Button>;
}

export function RefundButton({ paymentId, amountLabel }: { paymentId: string; amountLabel: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ error?: string; ok?: boolean }>();
  if (result?.ok) return <span className="text-xs text-muted-foreground">Refund requested. It shows here once Stripe confirms.</span>;
  return (
    <>
      <button type="button" disabled={pending} className="cursor-pointer text-xs text-muted-foreground hover:text-destructive"
        onClick={() => confirm(`Refund ${amountLabel} to the customer's card? DoneZo's 10% fee is refunded too. This can't be undone.`) && start(async () => setResult(await refundCardPayment(paymentId)))}>
        {pending ? "Refunding…" : "Refund"}
      </button>
      {result?.error ? <span className="text-xs text-destructive">{result.error}</span> : null}
    </>
  );
}
