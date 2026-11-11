"use client";

import { Form, useFormAction } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CurrentBusiness } from "@/lib/auth";
import { bpsToPercent } from "@/lib/format";
import { US_TIMEZONES } from "./timezones";
import { setMarketplaceEnabled, updateBusinessDetails, type SettingsState } from "./actions";

export function BusinessDetailsForm({ business }: { business: CurrentBusiness }) {
  const [state, action] = useFormAction<SettingsState>(updateBusinessDetails, { status: "idle" });
  return (
    <Form form={action}  className="space-y-4" noValidate>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Time zone" htmlFor="timezone" hint="Used for your calendar and recurring visits." error={state.fieldErrors?.timezone}>
          <Select id="timezone" name="timezone" defaultValue={business.timezone}>
            {US_TIMEZONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="Default sales tax (%)" htmlFor="defaultTax" hint="Pre-filled on new invoices. Check your local rules." error={state.fieldErrors?.defaultTax}>
          <Input id="defaultTax" name="defaultTax" inputMode="decimal" defaultValue={bpsToPercent(business.defaultTaxRateBps)} />
        </Field>
      </div>
      <Field label="About your business" htmlFor="description" error={state.fieldErrors?.description}>
        <Textarea id="description" name="description" defaultValue={business.description ?? ""} maxLength={2000} />
      </Field>
      {state.message ? <Alert tone={state.status === "error" ? "error" : "success"}>{state.message}</Alert> : null}
      <Button type="submit" disabled={action.pending}>
        {action.pending ? "Saving…" : "Save changes"}
      </Button>
    </Form>
  );
}

export function MarketplaceToggle({ enabled }: { enabled: boolean }) {
  const [state, action] = useFormAction<SettingsState>(setMarketplaceEnabled, { status: "idle" });
  return (
    <Form form={action}  className="space-y-4">
      <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
      {state.message ? <Alert tone={state.status === "error" ? "error" : "success"}>{state.message}</Alert> : null}
      <Button type="submit" variant={enabled ? "outline" : "primary"} disabled={action.pending}>
        {action.pending ? "Saving…" : enabled ? "Turn off marketplace access" : "Turn on marketplace access"}
      </Button>
    </Form>
  );
}
