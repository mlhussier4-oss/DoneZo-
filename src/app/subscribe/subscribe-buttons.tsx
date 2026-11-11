"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { PlanCode } from "@/config/plans";
import { manageBilling, subscribe } from "./actions";

export function SubscribeButton({ plan, label, variant = "primary" }: { plan: PlanCode; label: string; variant?: "primary" | "outline" }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="space-y-2">
      <Button size="lg" variant={variant} className="w-full" disabled={pending} onClick={() => start(async () => setError((await subscribe(plan))?.error))}>
        {pending ? "Opening secure checkout…" : label}
      </Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

export function ManageBillingButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => setError((await manageBilling())?.error))}>
        {pending ? "Opening…" : "Manage billing"}
      </Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
