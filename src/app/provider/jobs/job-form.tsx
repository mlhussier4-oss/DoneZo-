"use client";

import { Form, useFormAction } from "@/components/ui/form";
import { CustomerAddressFields } from "@/components/crm/customer-address-fields";
import { FormAlert } from "@/components/ui/form-alert";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { CategoryOption, CustomerOption } from "@/lib/crm/queries";
import { idle, type ActionState } from "@/lib/forms";

export type JobDefaults = {
  customerId?: string;
  addressId?: string | null;
  categoryId?: string | null;
  title?: string;
  description?: string | null;
  price?: string;
  date?: string;
  time?: string;
  durationMinutes?: number;
};

export function JobForm({
  action,
  customers,
  categories,
  defaults,
  submitLabel,
  lockCustomer,
  lockPrice,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  customers: CustomerOption[];
  categories: CategoryOption[];
  defaults: JobDefaults;
  submitLabel: string;
  lockCustomer?: boolean;
  lockPrice?: boolean;
}) {
  const [state, formAction] = useFormAction(action, idle);
  const e = state.fieldErrors ?? {};
  return (
    <Form form={formAction}  className="space-y-4" noValidate>
      <CustomerAddressFields customers={customers} categories={categories} defaults={defaults} errors={e} lockCustomer={lockCustomer} />
      <Field label="Job title" htmlFor="title" hint="What you'll see on the calendar, e.g. “Mow front and back”." error={e.title}>
        <Input id="title" name="title" defaultValue={defaults.title} maxLength={120} required />
      </Field>
      <Field label="Description (optional)" htmlFor="description" error={e.description}>
        <Textarea id="description" name="description" defaultValue={defaults.description ?? ""} maxLength={5000} className="min-h-20" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Price ($)" htmlFor="price" hint={lockPrice ? "Agreed with the customer" : undefined} error={e.price}>
          <Input id="price" name="price" inputMode="decimal" defaultValue={defaults.price ?? ""} placeholder="0.00" readOnly={lockPrice} className={lockPrice ? "bg-muted" : undefined} />
        </Field>
        <Field label="Date" htmlFor="date" error={e.date}>
          <Input id="date" name="date" type="date" defaultValue={defaults.date ?? ""} />
        </Field>
        <Field label="Start time" htmlFor="time" error={e.time}>
          <Input id="time" name="time" type="time" defaultValue={defaults.time ?? ""} />
        </Field>
        <Field label="Length (minutes)" htmlFor="durationMinutes" error={e.durationMinutes}>
          <Input id="durationMinutes" name="durationMinutes" type="number" min={5} max={1440} step={5} defaultValue={defaults.durationMinutes ?? 60} />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">Leave the date empty to save the job as unscheduled.</p>
      <FormAlert state={state} />
      <SubmitButton>{submitLabel}</SubmitButton>
    </Form>
  );
}
