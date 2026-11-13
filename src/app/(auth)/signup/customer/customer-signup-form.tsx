"use client";

import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Form, useFormAction } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { customerSignUp, type FormState } from "../../actions";
import { SubmitButton } from "../../_components/submit-button";
import { RememberMe } from "../../_components/remember-me";

export function CustomerSignupForm({ next }: { next?: string }) {
  const [state, action] = useFormAction<FormState>(customerSignUp, { status: "idle" });
  if (state.status === "success") {
    return (
      <Alert tone="success" className="flex gap-3">
        <MailCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="space-y-1">
          <p className="font-semibold">Check your email</p>
          <p>We sent a link to <strong>{state.email}</strong>. Tap it to confirm your account{next?.startsWith("/post-job") ? " and post your job" : ""}.</p>
        </div>
      </Alert>
    );
  }
  return (
    <Form form={action} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="First name" htmlFor="firstName" hint="Just your first name. That's all providers see." error={state.fieldErrors?.firstName}>
        <Input id="firstName" name="firstName" autoComplete="given-name" maxLength={30} required />
      </Field>
      <Field label="Email" htmlFor="email" hint="Never shared with providers." error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters, with a letter and a number." error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <RememberMe />
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <SubmitButton className="w-full" size="lg" pendingText="Creating account…">Create account</SubmitButton>
      <p className="text-center text-xs text-muted-foreground">By continuing you agree to DoneZo&apos;s <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy policy</Link>.</p>
    </Form>
  );
}
