"use client";

import { Form, useFormAction } from "@/components/ui/form";
import { updatePassword, type FormState } from "../../actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "../../_components/submit-button";

export function UpdatePasswordForm() {
  const [state, action] = useFormAction<FormState>(updatePassword, { status: "idle" });
  return (
    <Form form={action}  className="space-y-4" noValidate>
      <Field label="New password" htmlFor="password" hint="At least 8 characters, with a letter and a number." error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm" error={state.fieldErrors?.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <SubmitButton className="w-full" pendingText="Saving…">
        Save new password
      </SubmitButton>
    </Form>
  );
}
