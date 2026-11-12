"use client";

import Link from "next/link";
import { Form, useFormAction } from "@/components/ui/form";
import { useState } from "react";
import { Check, MailCheck } from "lucide-react";
import { providerSignUp, type FormState } from "../../actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SubmitButton } from "../../_components/submit-button";
import { ProviderPaymentTerms } from "@/components/legal/provider-payment-terms";

const usageOptions = [
  {
    value: "basic",
    title: "DoneZo Basic · $9.99/month",
    text: "The marketplace: a public profile, local job requests to bid on, and getting paid for the jobs you win.",
  },
  {
    value: "marketplace",
    title: "DoneZo Pro · $19.99/month, with marketplace",
    text: "Everything in Basic, plus business tools for all your customers: calendar, recurring visits, invoices, reports and your team.",
  },
  {
    value: "crm",
    title: "DoneZo Pro · $19.99/month, business tools only",
    text: "The same business tools for the customers you already have, with the marketplace switched off. Turn it on any time.",
  },
] as const;

export function ProviderSignupForm({ initialUsage }: { initialUsage: "basic" | "crm" | "marketplace" | null }) {
  const [state, action] = useFormAction<FormState>(providerSignUp, { status: "idle" });
  const [usage, setUsage] = useState<string | null>(initialUsage);

  if (state.status === "success") {
    return (
      <Alert tone="success" className="flex gap-3">
        <MailCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="space-y-1">
          <p className="font-semibold">Check your email</p>
          <p>
            We sent a confirmation link to <strong>{state.email}</strong>. Click it to activate your account and open your
            dashboard.
          </p>
        </div>
      </Alert>
    );
  }

  return (
    <Form form={action}  className="space-y-5" noValidate>
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-medium">Choose your plan</legend>
        {usageOptions.map((o) => {
          const selected = usage === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors",
                selected ? "border-primary bg-primary-soft ring-1 ring-primary" : "border-border hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name="usage"
                value={o.value}
                checked={selected}
                onChange={() => setUsage(o.value)}
                className="sr-only"
              />
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card",
                )}
                aria-hidden
              >
                {selected ? <Check className="size-3" /> : null}
              </span>
              <span>
                <span className="block font-semibold">{o.title}</span>
                <span className="block text-sm text-muted-foreground">{o.text}</span>
              </span>
            </label>
          );
        })}
        {state.fieldErrors?.usage ? <p className="text-sm text-destructive">{state.fieldErrors.usage}</p> : null}
        <p className="text-xs text-muted-foreground">You can switch plans later. No trial; you&apos;ll subscribe after confirming your email.</p>
      </fieldset>

      <Field label="Business name" htmlFor="businessName" error={state.fieldErrors?.businessName}>
        <Input id="businessName" name="businessName" autoComplete="organization" maxLength={120} required />
      </Field>
      <Field label="Your name" htmlFor="fullName" error={state.fieldErrors?.fullName}>
        <Input id="fullName" name="fullName" autoComplete="name" maxLength={120} required />
      </Field>
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        hint="At least 8 characters, with a letter and a number."
        error={state.fieldErrors?.password}
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>

      <fieldset className="space-y-3 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-medium">Provider terms</legend>
        <div className="max-h-48 overflow-y-auto rounded-md bg-muted p-3 text-xs leading-relaxed" tabIndex={0} aria-label="Provider terms">
          <ProviderPaymentTerms />
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" name="paymentTerms" required className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
          <span>I agree to the Provider terms. I understand I run my own business: I&apos;m responsible for my work and for collecting payment from my customers.</span>
        </label>
        {state.fieldErrors?.paymentTerms ? <p className="text-sm text-destructive">{state.fieldErrors.paymentTerms}</p> : null}
      </fieldset>

      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <SubmitButton className="w-full" size="lg" pendingText="Creating account…">
        Create provider account
      </SubmitButton>
      <p className="text-center text-xs text-muted-foreground">By continuing you agree to DoneZo&apos;s <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy policy</Link>.</p>
    </Form>
  );
}
