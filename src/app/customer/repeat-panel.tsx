"use client";

import { useState, useTransition } from "react";
import { Repeat } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { cancelRepeat, requestRepeat } from "./requests/actions";

import { REPEAT_FREQUENCIES as FREQUENCIES } from "@/config/marketplace";

/** Owner decision 2026-11-12: after the invoice, ask the same provider for repeat visits (they accept or decline). */
export function RepeatForm({ bookingId, providerName, priceCents, minDate }: { bookingId: string; providerName: string; priceCents: number; minDate: string }) {
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<string>("biweekly");
  const [visits, setVisits] = useState(4);
  const [firstDate, setFirstDate] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Repeat /> Make it recurring with {providerName}
      </Button>
    );
  }
  return (
    <div className="space-y-4 rounded-lg border border-border p-4" data-testid="repeat-form">
      <div>
        <p className="font-semibold">Repeat visits with {providerName}</p>
        <p className="text-sm text-muted-foreground">Same price as this job, {formatMoney(priceCents)} per visit, paid after each visit. {providerName} will accept or decline.</p>
      </div>
      <div role="radiogroup" aria-label="How often" className="flex flex-wrap gap-2">
        {FREQUENCIES.map((f) => (
          <button key={f.value} type="button" role="radio" aria-checked={frequency === f.value} onClick={() => setFrequency(f.value)}
            className={cn("min-h-11 cursor-pointer rounded-full border px-4 text-sm font-medium", frequency === f.value ? "border-primary bg-primary text-white" : "border-input bg-card hover:bg-muted")}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Number of visits" htmlFor="repeat-visits">
          <Select id="repeat-visits" value={visits} onChange={(e) => setVisits(Number(e.target.value))}>
            {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => <option key={n} value={n}>{n} visits</option>)}
          </Select>
        </Field>
        <Field label="First visit" htmlFor="repeat-first">
          <Input id="repeat-first" type="date" min={minDate} value={firstDate} onChange={(e) => setFirstDate(e.target.value)} />
        </Field>
      </div>
      <p className="text-sm">Total if all visits happen: <strong>{formatMoney(priceCents * visits)}</strong> ({visits} × {formatMoney(priceCents)})</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" disabled={pending || !firstDate} onClick={() => start(async () => setError((await requestRepeat(bookingId, frequency, visits, firstDate)).error))}>
          {pending ? "Sending…" : `Send request to ${providerName}`}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

export function CancelRepeatButton({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await cancelRepeat(requestId); })}>
      Withdraw request
    </Button>
  );
}
