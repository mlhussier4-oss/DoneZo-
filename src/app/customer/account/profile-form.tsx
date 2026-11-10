"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { updateProfile, type ProfileState } from "./actions";

export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, { status: "idle" });
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="email" hint="You sign in with a code sent to this address.">
        <Input id="email" value={email} disabled readOnly />
      </Field>
      <Field label="Name" htmlFor="fullName" error={state.fieldErrors?.fullName}>
        <Input id="fullName" name="fullName" defaultValue={fullName} autoComplete="name" maxLength={120} />
      </Field>
      <Field label="Phone" htmlFor="phone" hint="Optional. Shared only with a provider you hire." error={state.fieldErrors?.phone}>
        <Input id="phone" name="phone" type="tel" defaultValue={phone} autoComplete="tel" maxLength={30} />
      </Field>
      {state.message ? <Alert tone={state.status === "error" ? "error" : "success"}>{state.message}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
