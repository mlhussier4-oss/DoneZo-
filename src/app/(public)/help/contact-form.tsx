"use client";

import { Form, useFormAction } from "@/components/ui/form";
import { FormAlert } from "@/components/ui/form-alert";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle } from "@/lib/forms";
import { contactSupport } from "@/lib/support/actions";
import { supportCategories } from "@/lib/support/categories";

export function ContactForm() {
  const [state, form] = useFormAction(contactSupport, idle);
  const e = state.fieldErrors ?? {};
  return (
    <Form form={form} className="space-y-4" noValidate key={state.status === "success" ? state.message : "form"}>
      <Field label="Topic" htmlFor="support-category" error={e.category}>
        <Select id="support-category" name="category" defaultValue="question">
          {supportCategories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
      </Field>
      <Field label="Subject" htmlFor="support-subject" error={e.subject}>
        <Input id="support-subject" name="subject" maxLength={150} />
      </Field>
      <Field label="How can we help?" htmlFor="support-message" hint="Include any invoice number or job details. Don't send card numbers or passwords." error={e.message}>
        <Textarea id="support-message" name="message" maxLength={4000} className="min-h-32" />
      </Field>
      <FormAlert state={state} />
      <SubmitButton pendingText="Sending…">Send to support</SubmitButton>
    </Form>
  );
}
