"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { submitReport } from "@/lib/marketplace/actions";

/** "Report a problem" on a booking. Each side can report that the other cancelled (owner decision 2026-11-14). */
export function ReportProblemForm({ bookingId, requestId, side = "customer" }: { bookingId?: string; requestId?: string; side?: "customer" | "provider" }) {
  const [state, action, pending] = useActionState(submitReport, { status: "idle" });
  if (state.status === "success") return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId ?? ""} />
      <input type="hidden" name="requestId" value={requestId ?? ""} />
      <Field label="What's it about?" htmlFor="report-category">
        <Select id="report-category" name="category" defaultValue="problem_with_job">
          <option value="problem_with_job">A problem with the job</option>
          {side === "customer" ? <option value="provider_cancelled">Provider cancelled</option> : <option value="customer_cancelled">Customer cancelled</option>}
          <option value="payment">Payment</option>
          <option value="safety">Safety concern</option>
          <option value="other">Something else</option>
        </Select>
      </Field>
      <Field label="Tell us what happened" htmlFor="report-message">
        <Textarea id="report-message" name="message" maxLength={4000} required />
      </Field>
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <Button type="submit" variant="outline" size="sm" disabled={pending}>Send to HomeHire support</Button>
    </form>
  );
}
