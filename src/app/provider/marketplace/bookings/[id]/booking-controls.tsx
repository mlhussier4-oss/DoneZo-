"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, useFormAction } from "@/components/ui/form";
import { FormAlert } from "@/components/ui/form-alert";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle } from "@/lib/forms";
import { cancelBookingAsProvider, proposeChangeOrder, withdrawChangeOrder } from "../../actions";

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
