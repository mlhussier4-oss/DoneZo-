"use client";

import { useActionState } from "react";
import { updatePassword, type FormState } from "../../actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "../../_components/submit-button";

export function UpdatePasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(updatePassword, { status: "idle" });
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="New password" htmlFor="password" hint="At least 8 characters." error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm" error={state.fieldErrors?.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <SubmitButton className="w-full" pendingText="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
