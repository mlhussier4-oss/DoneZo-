"use client";

import { useActionState, useState } from "react";
import { Check, MailCheck } from "lucide-react";
import { providerSignUp, type FormState } from "../../actions";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SubmitButton } from "../../_components/submit-button";

const usageOptions = [
  {
    value: "crm",
    title: "Business Management only",
    text: "Customers, calendar, jobs, invoicing and payments for the customers you already have. No bidding, no job alerts.",
  },
  {
    value: "marketplace",
    title: "Business Management + Marketplace",
    text: "Everything above, plus a public profile and local job requests you can bid on.",
  },
] as const;

export function ProviderSignupForm({ initialUsage }: { initialUsage: "crm" | "marketplace" | null }) {
  const [state, action] = useActionState<FormState, FormData>(providerSignUp, { status: "idle" });
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
    <form action={action} className="space-y-5" noValidate>
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-medium">How would you like to use our platform?</legend>
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
        <p className="text-xs text-muted-foreground">You can turn the marketplace on or off later in Business settings.</p>
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
        hint="At least 8 characters."
        error={state.fieldErrors?.password}
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>

      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <SubmitButton className="w-full" size="lg" pendingText="Creating account…">
        Create provider account
      </SubmitButton>
    </form>
  );
}
