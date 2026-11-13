"use client";

import Link from "next/link";
import { Form, useFormAction } from "@/components/ui/form";
import { MailCheck } from "lucide-react";
import { sendEmailCode, verifyEmailCode, type FormState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "./submit-button";
import { RememberMe } from "./remember-me";

/**
 * Passwordless sign-in / sign-up with a 6-digit email code.
 * This is the same flow customers will use at the "Post Job" step.
 */
export function EmailCodeForm({ askName = false, next }: { askName?: boolean; next?: string }) {
  const [sendState, sendAction] = useFormAction<FormState>(sendEmailCode, { status: "idle" });
  const [verifyState, verifyAction] = useFormAction<FormState>(verifyEmailCode, { status: "idle" });

  if (sendState.status === "verify") {
    const email = sendState.email!;
    return (
      <Form form={verifyAction}  className="space-y-4" noValidate>
        <Alert tone="info" className="flex gap-2">
          <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            We sent a 6-digit code to <strong>{email}</strong>. It may take a minute to arrive.
          </span>
        </Alert>
        <input type="hidden" name="email" value={email} />
        <RememberMe />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Field label="Code" htmlFor="token" error={verifyState.fieldErrors?.token}>
          <Input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            className="text-center text-lg tracking-[0.5em]"
          />
        </Field>
        {verifyState.message ? <Alert tone="error">{verifyState.message}</Alert> : null}
        <SubmitButton className="w-full" pendingText="Checking…">
          Continue
        </SubmitButton>
      </Form>
    );
  }

  return (
    <Form form={sendAction}  className="space-y-4" noValidate>
      {askName ? (
        <Field label="Your name" htmlFor="fullName" hint="Optional. Shown to the provider you hire.">
          <Input id="fullName" name="fullName" autoComplete="name" maxLength={120} />
        </Field>
      ) : null}
      <Field label="Email" htmlFor="code-email" error={sendState.fieldErrors?.email}>
        <Input id="code-email" name="email" type="email" autoComplete="email" required />
      </Field>
      {sendState.message ? <Alert tone="error">{sendState.message}</Alert> : null}
      <SubmitButton className="w-full" pendingText="Sending code…">
        Email me a code
      </SubmitButton>
      <p className="text-center text-xs text-muted-foreground">No password needed. We&apos;ll email you a sign-in code.</p>
      <p className="text-center text-xs text-muted-foreground">By continuing you agree to DoneZo&apos;s <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy policy</Link>.</p>
    </Form>
  );
}
