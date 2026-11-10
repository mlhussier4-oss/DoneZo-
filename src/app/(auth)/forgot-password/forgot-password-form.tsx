"use client";

import { useActionState } from "react";
import { requestPasswordReset, type FormState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "../_components/submit-button";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, { status: "idle" });
  if (state.status === "success") {
    return (
      <Alert tone="success">
        If an account exists for <strong>{state.email}</strong>, we&apos;ve sent a link to reset the password.
      </Alert>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <SubmitButton className="w-full" pendingText="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
