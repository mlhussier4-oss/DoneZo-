"use client";

import { useState, useTransition } from "react";
import { CreditCard, Lock } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { payInvoiceByCard } from "@/lib/payments/actions";

export function PayByCardButton({ token, amountLabel }: { token: string; amountLabel: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="space-y-2">
      <Button size="lg" variant="accent" className="w-full" disabled={pending} onClick={() => start(async () => setError((await payInvoiceByCard(token))?.error))}>
        <CreditCard /> {pending ? "Opening secure payment…" : `Pay ${amountLabel} by card`}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3.5" aria-hidden />Secure payment by Stripe. Your card details never touch HomeHire.</p>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
