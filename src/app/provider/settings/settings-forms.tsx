"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { CurrentBusiness } from "@/lib/auth";
import { setMarketplaceEnabled, updateBusinessDetails, type SettingsState } from "./actions";

export function BusinessDetailsForm({ business }: { business: CurrentBusiness }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateBusinessDetails, { status: "idle" });
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Business name" htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" defaultValue={business.name} maxLength={120} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business email" htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" defaultValue={business.email ?? ""} />
        </Field>
        <Field label="Business phone" htmlFor="phone" error={state.fieldErrors?.phone}>
          <Input id="phone" name="phone" type="tel" defaultValue={business.phone ?? ""} maxLength={30} />
        </Field>
      </div>
      <Field label="About your business" htmlFor="description" error={state.fieldErrors?.description}>
        <Textarea id="description" name="description" defaultValue={business.description ?? ""} maxLength={2000} />
      </Field>
      {state.message ? <Alert tone={state.status === "error" ? "error" : "success"}>{state.message}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

export function MarketplaceToggle({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(setMarketplaceEnabled, { status: "idle" });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
      {state.message ? <Alert tone={state.status === "error" ? "error" : "success"}>{state.message}</Alert> : null}
      <Button type="submit" variant={enabled ? "outline" : "primary"} disabled={pending}>
        {pending ? "Saving…" : enabled ? "Turn off marketplace access" : "Turn on marketplace access"}
      </Button>
    </form>
  );
}
