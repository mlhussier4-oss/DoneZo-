"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { decideRepeat } from "../../actions";

/** Provider accepts (schedules every visit) or declines a customer's repeat-visit request. */
export function RepeatDecision({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const run = (accept: boolean) => start(async () => setError((await decideRepeat(requestId, accept)).error));
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" disabled={pending} onClick={() => run(true)}>{pending ? "Saving…" : "Accept and schedule visits"}</Button>
        <Button variant="outline" disabled={pending} onClick={() => confirm("Decline these repeat visits?") && run(false)}>Decline</Button>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
