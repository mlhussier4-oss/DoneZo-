"use client";

import { Form, useFormAction } from "@/components/ui/form";
import { useState } from "react";
import { CustomerAddressFields } from "@/components/crm/customer-address-fields";
import { FormAlert } from "@/components/ui/form-alert";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { frequencyLabels } from "@/lib/crm/labels";
import type { CategoryOption, CustomerOption } from "@/lib/crm/queries";
import { idle, type ActionState } from "@/lib/forms";

export type ScheduleDefaults = {
  customerId?: string;
  addressId?: string | null;
  categoryId?: string | null;
  title?: string;
  description?: string | null;
  price?: string;
  frequency?: keyof typeof frequencyLabels;
  intervalDays?: number | null;
  startDate?: string;
  startTime?: string;
  durationMinutes?: number;
  endDate?: string | null;
};

export function ScheduleForm({
  action,
  customers,
  categories,
  defaults,
  submitLabel,
  lockCustomer,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  customers: CustomerOption[];
  categories: CategoryOption[];
  defaults: ScheduleDefaults;
  submitLabel: string;
  lockCustomer?: boolean;
}) {
  const [state, formAction] = useFormAction(action, idle);
  const [frequency, setFrequency] = useState(defaults.frequency ?? "weekly");
  const e = state.fieldErrors ?? {};
  return (
    <Form form={formAction}  className="space-y-4" noValidate>
      <CustomerAddressFields customers={customers} categories={categories} defaults={defaults} errors={e} lockCustomer={lockCustomer} />
      <Field label="Service title" htmlFor="title" hint="E.g. “Weekly mow and edge”." error={e.title}>
        <Input id="title" name="title" defaultValue={defaults.title} maxLength={120} required />
      </Field>
      <Field label="Description (optional)" htmlFor="description" error={e.description}>
        <Textarea id="description" name="description" defaultValue={defaults.description ?? ""} maxLength={2000} className="min-h-16" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price per visit ($)" htmlFor="price" error={e.price}>
          <Input id="price" name="price" inputMode="decimal" defaultValue={defaults.price ?? ""} placeholder="0.00" />
        </Field>
        <Field label="How often" htmlFor="frequency" error={e.frequency}>
          <Select id="frequency" name="frequency" value={frequency} onChange={(ev) => setFrequency(ev.target.value as typeof frequency)}>
            {Object.entries(frequencyLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        {frequency === "custom" ? (
          <Field label="Every how many days" htmlFor="intervalDays" error={e.intervalDays}>
            <Input id="intervalDays" name="intervalDays" type="number" min={1} max={365} defaultValue={defaults.intervalDays ?? 10} />
          </Field>
        ) : <input type="hidden" name="intervalDays" value="" />}
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="First visit" htmlFor="startDate" error={e.startDate}>
          <Input id="startDate" name="startDate" type="date" defaultValue={defaults.startDate ?? ""} required />
        </Field>
        <Field label="Start time" htmlFor="startTime" error={e.startTime}>
          <Input id="startTime" name="startTime" type="time" defaultValue={defaults.startTime ?? "09:00"} required />
        </Field>
        <Field label="Length (minutes)" htmlFor="durationMinutes" error={e.durationMinutes}>
          <Input id="durationMinutes" name="durationMinutes" type="number" min={5} max={1440} step={5} defaultValue={defaults.durationMinutes ?? 60} />
        </Field>
        <Field label="Ends (optional)" htmlFor="endDate" error={e.endDate}>
          <Input id="endDate" name="endDate" type="date" defaultValue={defaults.endDate ?? ""} />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        {frequency === "monthly"
          ? "Monthly visits fall on the same day of the month as the first visit (or the last day, in shorter months)."
          : "Visits repeat on the same weekday as the first visit."}{" "}
        DoneZo keeps the next 90 days of visits on your calendar.
      </p>
      <FormAlert state={state} />
      <SubmitButton>{submitLabel}</SubmitButton>
    </Form>
  );
}
