"use client";

import { Form, useFormAction } from "@/components/ui/form";
import Link from "next/link";
import { passwordSignIn, type FormState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "./submit-button";
import { RememberMe } from "./remember-me";

export function PasswordSignInForm({ next }: { next?: string }) {
  const [state, action] = useFormAction<FormState>(passwordSignIn, { status: "idle" });
  return (
    <Form form={action}  className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <RememberMe />
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <SubmitButton className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-primary hover:underline">
          Forgot your password?
        </Link>
      </p>
    </Form>
  );
}
