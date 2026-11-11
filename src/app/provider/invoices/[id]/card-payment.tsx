"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createCardPaymentLink } from "../actions";

export function CreateCardLinkButton({ invoiceId }: { invoiceId: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ url?: string; error?: string }>();
  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => setResult(await createCardPaymentLink(invoiceId)))}>
        <CreditCard /> {pending ? "Creating…" : "Create card payment link"}
      </Button>
      {result?.url ? <p className="text-xs break-all text-muted-foreground">Stripe payment page: <a href={result.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{result.url}</a></p> : null}
      {result?.error ? <Alert tone="error">{result.error}</Alert> : null}
    </div>
  );
}
