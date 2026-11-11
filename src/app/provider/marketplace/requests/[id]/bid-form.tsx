"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, useFormAction } from "@/components/ui/form";
import { FormAlert } from "@/components/ui/form-alert";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { centsToInput } from "@/lib/format";
import { idle } from "@/lib/forms";
import { saveBid, withdrawBid } from "../../actions";

export type ExistingBid = {
  id: string;
  price_cents: number;
  included: string;
  availability: string;
  exclusions: string | null;
  additional_charges: string | null;
  message: string | null;
};

export function BidForm({ requestId, bid }: { requestId: string; bid: ExistingBid | null }) {
  const [state, form] = useFormAction(saveBid.bind(null, requestId, bid?.id ?? null), idle);
  const e = state.fieldErrors ?? {};
  return (
    <Form form={form} className="space-y-4" noValidate>
      <Field label="Your price ($)" htmlFor="price" hint="The total the customer pays. It can only change later if the customer approves." error={e.price}>
        <Input id="price" name="price" inputMode="decimal" defaultValue={bid ? centsToInput(bid.price_cents) : ""} className="text-lg font-semibold" />
      </Field>
      <Field label="What's included" htmlFor="included" error={e.included}>
        <Textarea id="included" name="included" defaultValue={bid?.included ?? ""} maxLength={2000} className="min-h-20" placeholder="E.g. mow, edge and blow front and back" />
      </Field>
      <Field label="When you can do it" htmlFor="availability" error={e.availability}>
        <Input id="availability" name="availability" defaultValue={bid?.availability ?? ""} maxLength={300} placeholder="E.g. Thursday or Friday morning" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Not included (optional)" htmlFor="exclusions" error={e.exclusions}>
          <Textarea id="exclusions" name="exclusions" defaultValue={bid?.exclusions ?? ""} maxLength={1000} className="min-h-16" />
        </Field>
        <Field label="Possible extra charges (optional)" htmlFor="additionalCharges" error={e.additionalCharges}>
          <Textarea id="additionalCharges" name="additionalCharges" defaultValue={bid?.additional_charges ?? ""} maxLength={1000} className="min-h-16" placeholder="E.g. $20 if over 2 truckloads" />
        </Field>
      </div>
      <Field label="Message to the customer (optional)" htmlFor="message" error={e.message}>
        <Textarea id="message" name="message" defaultValue={bid?.message ?? ""} maxLength={1000} className="min-h-16" />
      </Field>
      <FormAlert state={state} />
      <SubmitButton size="lg">{bid ? "Update bid" : "Send bid"}</SubmitButton>
      <p className="text-xs text-muted-foreground">Other providers never see your price. You can&apos;t message the customer until they accept your bid.</p>
    </Form>
  );
}

export function WithdrawBidButton({ bidId }: { bidId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <>
      <Button variant="ghost" size="sm" disabled={pending}
        onClick={() => confirm("Withdraw your bid?") && start(async () => setError((await withdrawBid(bidId)).error))}>
        Withdraw bid
      </Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </>
  );
}
