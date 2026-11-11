"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, useFormAction } from "@/components/ui/form";
import { FormAlert } from "@/components/ui/form-alert";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle } from "@/lib/forms";
import { cancelBookingAsProvider, completeAndRequestPayment, proposeChangeOrder, withdrawChangeOrder } from "../../actions";

export function ChangeOrderForm({ bookingId }: { bookingId: string }) {
  const [state, form] = useFormAction(proposeChangeOrder.bind(null, bookingId), idle);
  return (
    <Form form={form} className="space-y-3" noValidate>
      <Field label="New total price ($)" htmlFor="co-price" error={state.fieldErrors?.price}>
        <Input id="co-price" name="price" inputMode="decimal" />
      </Field>
      <Field label="What changed?" htmlFor="co-description" error={state.fieldErrors?.description}>
        <Textarea id="co-description" name="description" maxLength={2000} className="min-h-20" placeholder="E.g. two extra truckloads found in the back yard" />
      </Field>
      <FormAlert state={state} />
      <SubmitButton size="sm" variant="outline">Send to customer for approval</SubmitButton>
    </Form>
  );
}

export function WithdrawChangeButton({ changeOrderId }: { changeOrderId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(async () => setError((await withdrawChangeOrder(changeOrderId)).error))}>Withdraw</Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </>
  );
}

export function ProviderCancelBookingButton({ bookingId }: { bookingId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => {
        const reason = prompt("Cancel this booking? The customer will be told. Reason (optional):");
        if (reason !== null) start(async () => setError((await cancelBookingAsProvider(bookingId, reason)).error));
      }}>
        Cancel booking
      </Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </>
  );
}

export function CompleteAndRequestPaymentButton({ bookingId }: { bookingId: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ error?: string; ok?: boolean }>();
  if (result?.ok) return <Alert tone="success">Done. The customer has the invoice and a secure payment link in your messages.</Alert>;
  return (
    <div className="space-y-2">
      <Button className="w-full" disabled={pending}
        onClick={() => confirm("Mark this job complete and send the customer the invoice and payment link?") && start(async () => setResult(await completeAndRequestPayment(bookingId)))}>
        {pending ? "Sending…" : "Mark complete & send payment"}
      </Button>
      <p className="text-xs text-muted-foreground">Add completion photos on the job first if you like. The job is marked paid only when Stripe confirms the payment.</p>
      {result?.error ? <Alert tone="error">{result.error}</Alert> : null}
    </div>
  );
}
