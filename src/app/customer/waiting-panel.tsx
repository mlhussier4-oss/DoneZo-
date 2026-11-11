"use client";

import { useState, useTransition } from "react";
import { Clock, Plus, UserX } from "lucide-react";
import { CountdownClock, useSecondsLeft } from "@/components/marketplace/countdown";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { checkDeadline, dropProvider, extendProvider } from "./requests/actions";

/** Owner decision 2026-11-12: the chosen provider has 5:00 to confirm; from 2:00 the customer can add 10 minutes or drop them. */
export function WaitingPanel({ bookingId, providerName, confirmBy, serverNow }: { bookingId: string; providerName: string; confirmBy: string; serverNow: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const left = useSecondsLeft(confirmBy, serverNow, () => start(async () => { await checkDeadline(bookingId); }));
  const run = (fn: () => Promise<{ error?: string }>) => start(async () => setError((await fn()).error));
  return (
    <div className="space-y-3 rounded-lg border-2 border-cta bg-accent-soft p-4" data-testid="waiting-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-semibold">Waiting for {providerName} to confirm</p>
            <p className="text-sm text-muted-foreground">They&apos;ve been notified and must confirm your job and price with an arrival time. Once they do, a chat opens here so you can share your details.</p>
          </div>
        </div>
        <CountdownClock seconds={left} />
      </div>
      {left !== null && left > 0 && left <= 120 ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" disabled={pending} onClick={() => run(() => extendProvider(bookingId))}><Plus /> Give them 10 more minutes</Button>
          <Button className="flex-1" variant="outline" disabled={pending} onClick={() => confirm(`Drop ${providerName} and choose another bid?`) && run(() => dropProvider(bookingId))}><UserX /> Drop provider</Button>
        </div>
      ) : left === 0 ? (
        <p className="text-sm font-medium">Time&apos;s up. Updating…</p>
      ) : (
        <p className="text-xs text-muted-foreground">At 2:00 you can give them more time or choose someone else.</p>
      )}
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
