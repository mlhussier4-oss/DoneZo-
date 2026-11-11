"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { PlanCode } from "@/config/plans";
import { changePlan } from "./actions";

export function ChangePlanButton({ plan, label, variant = "primary" }: { plan: PlanCode; label: string; variant?: "primary" | "outline" }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="space-y-2">
      <Button className="w-full" variant={variant} disabled={pending} onClick={() => start(async () => setError((await changePlan(plan))?.error))}>
        {pending ? "Opening Stripe…" : label}
      </Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
