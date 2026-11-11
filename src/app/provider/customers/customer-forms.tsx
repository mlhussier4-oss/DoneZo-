"use client";

import { Form, useFormAction } from "@/components/ui/form";
import { useRef } from "react";
import { Field, Input, Textarea } from "@/components/ui/input";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle, type ActionState } from "@/lib/forms";
import { addAddress, addNote, createCustomer, updateCustomer } from "./actions";

type CustomerValues = { full_name: string; email: string | null; phone: string | null; service_preferences: string | null };

function ContactFields({ state, values }: { state: ActionState; values?: CustomerValues }) {
  const e = state.fieldErrors ?? {};
  return (
    <>
      <Field label="Name" htmlFor="fullName" error={e.fullName}>
        <Input id="fullName" name="fullName" defaultValue={values?.full_name} maxLength={120} required autoComplete="off" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="phone" error={e.phone}>
          <Input id="phone" name="phone" type="tel" defaultValue={values?.phone ?? ""} maxLength={30} autoComplete="off" />
        </Field>
        <Field label="Email" htmlFor="email" error={e.email}>
          <Input id="email" name="email" type="email" defaultValue={values?.email ?? ""} autoComplete="off" />
        </Field>
      </div>
      <Field label="Service preferences" htmlFor="servicePreferences" hint="E.g. back gate only, no mowing before 9am, dog in yard." error={e.servicePreferences}>
        <Textarea id="servicePreferences" name="servicePreferences" defaultValue={values?.service_preferences ?? ""} maxLength={2000} className="min-h-20" />
      </Field>
    </>
  );
}

export function AddressFields({ state, idPrefix = "" }: { state: ActionState; idPrefix?: string }) {
  const e = state.fieldErrors ?? {};
  const id = (n: string) => `${idPrefix}${n}`;
  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <div className="sm:col-span-4">
        <Field label="Street address" htmlFor={id("line1")} error={e.line1}>
          <Input id={id("line1")} name="line1" maxLength={200} autoComplete="off" />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Apt, suite (optional)" htmlFor={id("line2")} error={e.line2}>
          <Input id={id("line2")} name="line2" maxLength={200} autoComplete="off" />
        </Field>
      </div>
      <div className="sm:col-span-3">
        <Field label="City" htmlFor={id("city")} error={e.city}>
          <Input id={id("city")} name="city" maxLength={100} autoComplete="off" />
        </Field>
      </div>
      <div className="sm:col-span-1">
        <Field label="State" htmlFor={id("state")} error={e.state}>
          <Input id={id("state")} name="state" maxLength={50} autoComplete="off" />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="ZIP code" htmlFor={id("postalCode")} error={e.postalCode}>
          <Input id={id("postalCode")} name="postalCode" inputMode="numeric" maxLength={12} autoComplete="off" />
        </Field>
      </div>
      <div className="sm:col-span-6">
        <Field label="Access notes (optional)" htmlFor={id("accessNotes")} hint="Gate codes, parking, where to start." error={e.accessNotes}>
          <Input id={id("accessNotes")} name="accessNotes" maxLength={1000} autoComplete="off" />
        </Field>
      </div>
    </div>
  );
}

export function NewCustomerForm() {
  const [state, action] = useFormAction(createCustomer, idle);
  return (
    <Form form={action}  className="space-y-6" noValidate>
      <section className="space-y-4">
        <h2 className="font-semibold">Contact</h2>
        <ContactFields state={state} />
      </section>
      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Service address</h2>
          <p className="text-sm text-muted-foreground">Optional. You can add more addresses later.</p>
        </div>
        <AddressFields state={state} />
      </section>
      <section className="space-y-2">
        <Field label="First note (optional)" htmlFor="note">
          <Textarea id="note" name="note" maxLength={5000} className="min-h-20" />
        </Field>
      </section>
      <FormAlert state={state} />
      <SubmitButton pendingText="Adding…">Add customer</SubmitButton>
    </Form>
  );
}

export function EditCustomerForm({ customerId, values }: { customerId: string; values: CustomerValues }) {
  const [state, action] = useFormAction(updateCustomer.bind(null, customerId), idle);
  return (
    <Form form={action}  className="space-y-4" noValidate>
      <ContactFields state={state} values={values} />
      <FormAlert state={state} />
      <SubmitButton>Save changes</SubmitButton>
    </Form>
  );
}

export function AddAddressForm({ customerId }: { customerId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useFormAction(async (prev: ActionState, fd: FormData) => {
    const result = await addAddress(customerId, prev, fd);
    if (result.status === "success") ref.current?.reset();
    return result;
  }, idle);
  return (
    <Form form={action} ref={ref}  className="space-y-4" noValidate>
      <AddressFields state={state} idPrefix="new-" />
      <FormAlert state={state} />
      <SubmitButton size="sm" variant="outline" pendingText="Adding…">Add address</SubmitButton>
    </Form>
  );
}

export function AddNoteForm({ customerId }: { customerId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useFormAction(async (prev: ActionState, fd: FormData) => {
    const result = await addNote(customerId, prev, fd);
    if (result.status === "success") ref.current?.reset();
    return result;
  }, idle);
  return (
    <Form form={action} ref={ref}  className="space-y-2" noValidate>
      <label htmlFor="note-body" className="sr-only">New note</label>
      <Textarea id="note-body" name="body" placeholder="Add a note…" maxLength={5000} className="min-h-20" />
      {state.fieldErrors?.body ? <p className="text-sm text-destructive">{state.fieldErrors.body}</p> : null}
      <SubmitButton size="sm" pendingText="Saving…">Save note</SubmitButton>
    </Form>
  );
}
