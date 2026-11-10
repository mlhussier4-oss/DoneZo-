"use client";

import { Form, useFormAction } from "@/components/ui/form";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { recordableMethods } from "@/lib/crm/labels";
import { centsToInput } from "@/lib/format";
import { idle } from "@/lib/forms";
import { deleteDraft, deletePayment, recordPayment, sendInvoice, voidInvoice } from "../actions";

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const run = (fn: () => Promise<{ error?: string } | void>) =>
    start(async () => {
      const r = await fn();
      setError(r && "error" in r ? r.error : undefined);
    });
  return { pending, error, run };
}

export function InvoiceButtons({ invoiceId, status, hasPayments }: { invoiceId: string; status: string; hasPayments: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "draft" ? (
          <Button size="sm" disabled={pending} onClick={() => run(() => sendInvoice(invoiceId))}>Mark as sent</Button>
        ) : null}
        {status === "draft" ? (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirm("Delete this draft invoice?") && run(() => deleteDraft("invoice", invoiceId))}>
            Delete draft
          </Button>
        ) : null}
        {status !== "draft" && status !== "void" && !hasPayments ? (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirm("Void this invoice? It stays in your records but is no longer owed.") && run(() => voidInvoice(invoiceId))}>
            Void invoice
          </Button>
        ) : null}
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

export function RecordPaymentForm({ invoiceId, balanceCents, today }: { invoiceId: string; balanceCents: number; today: string }) {
  const [state, action] = useFormAction(recordPayment.bind(null, invoiceId), idle);
  return (
    <Form form={action}  className="space-y-3" key={state.status === "success" ? `done-${balanceCents}` : "form"}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount ($)" htmlFor="amount">
          <Input id="amount" name="amount" inputMode="decimal" defaultValue={centsToInput(balanceCents)} />
        </Field>
        <Field label="Date received" htmlFor="receivedOn">
          <Input id="receivedOn" name="receivedOn" type="date" defaultValue={today} />
        </Field>
      </div>
      <Field label="Method" htmlFor="method">
        <Select id="method" name="method" defaultValue="cash">
          {recordableMethods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
      </Field>
      <Field label="Note (optional)" htmlFor="payment-note">
        <Input id="payment-note" name="note" maxLength={1000} placeholder="E.g. check #1042" />
      </Field>
      <FormAlert state={state} />
      <SubmitButton size="sm">Record payment</SubmitButton>
      <p className="text-xs text-muted-foreground">
        Recorded payments are marked “Recorded by you”. Card payments through Stripe arrive in a later phase and are marked “Verified by Stripe”.
      </p>
    </Form>
  );
}

export function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const { pending, error, run } = useAction();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => confirm("Delete this payment record?") && run(() => deletePayment(paymentId))}
        className="cursor-pointer text-xs text-muted-foreground hover:text-destructive"
      >
        Delete
      </button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </>
  );
}
