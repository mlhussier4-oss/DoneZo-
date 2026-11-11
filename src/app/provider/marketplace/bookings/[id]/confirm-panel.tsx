"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Timer } from "lucide-react";
import { CountdownClock, useSecondsLeft } from "@/components/marketplace/countdown";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { checkDeadline } from "@/app/customer/requests/actions";
import { confirmBooking } from "../../actions";

/** Owner decision 2026-11-12: confirm within the countdown with an arrival time, or the job goes back to the customer. */
export function ConfirmPanel({ bookingId, confirmBy, serverNow, defaultDate, defaultTime }: {
  bookingId: string; confirmBy: string; serverNow: string; defaultDate: string; defaultTime: string;
}) {
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const left = useSecondsLeft(confirmBy, serverNow, () => start(async () => { await checkDeadline(bookingId); }));
  return (
    <div className="space-y-4 rounded-xl border-2 border-cta bg-accent-soft p-5" data-testid="confirm-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <Timer className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="text-lg font-semibold">The customer chose you. Confirm now</p>
            <p className="text-sm text-muted-foreground">Confirm the job at your bid price and pick when you&apos;ll arrive. You&apos;ll then get the customer&apos;s address and a chat with them. If time runs out, they can hire someone else.</p>
          </div>
        </div>
        <CountdownClock seconds={left} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Arrival date" htmlFor="arrival-date"><Input id="arrival-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Arrival time" htmlFor="arrival-time"><Input id="arrival-time" type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <Button size="lg" disabled={pending || left === 0} onClick={() => start(async () => setError((await confirmBooking(bookingId, date, time)).error))}>
          <CheckCircle2 /> {pending ? "Confirming…" : "Confirm job"}
        </Button>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
