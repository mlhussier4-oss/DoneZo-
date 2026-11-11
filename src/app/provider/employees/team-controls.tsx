"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, useFormAction } from "@/components/ui/form";
import { FormAlert } from "@/components/ui/form-alert";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { idle } from "@/lib/forms";
import { changeRole, inviteTeamMember, removeTeamMember, revokeInvite } from "./actions";

export function InviteForm({ canInviteManagers }: { canInviteManagers: boolean }) {
  const [state, form] = useFormAction(inviteTeamMember, idle);
  return (
    <Form form={form} className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem_auto] sm:items-end" noValidate key={state.status === "success" ? state.message : "form"}>
      <Field label="Email" htmlFor="invite-email" error={state.fieldErrors?.email}>
        <Input id="invite-email" name="email" type="email" autoComplete="off" />
      </Field>
      <Field label="Name (optional)" htmlFor="invite-name">
        <Input id="invite-name" name="fullName" autoComplete="off" maxLength={120} />
      </Field>
      <Field label="Role" htmlFor="invite-role">
        <Select id="invite-role" name="role" defaultValue="employee">
          <option value="employee">Employee</option>
          {canInviteManagers ? <option value="manager">Manager</option> : null}
        </Select>
      </Field>
      <SubmitButton pendingText="Sending…">Send invite</SubmitButton>
      <div className="sm:col-span-4"><FormAlert state={state} /></div>
    </Form>
  );
}

function useRun() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return { pending, error, run: (fn: () => Promise<{ error?: string }>) => start(async () => setError((await fn()).error)) };
}

export function MemberControls({ userId, role, isOwnerViewing, name }: { userId: string; role: "manager" | "employee"; isOwnerViewing: boolean; name: string }) {
  const { pending, error, run } = useRun();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {isOwnerViewing ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => changeRole(userId, role === "manager" ? "employee" : "manager"))}>
          Make {role === "manager" ? "employee" : "manager"}
        </Button>
      ) : null}
      {isOwnerViewing || role === "employee" ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirm(`Remove ${name} from your team? They'll lose access right away. Their past work stays in your records.`) && run(() => removeTeamMember(userId))}>
          Remove
        </Button>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

export function RevokeInviteButton({ id }: { id: string }) {
  const { pending, error, run } = useRun();
  return (
    <>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => revokeInvite(id))}>Cancel invite</Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </>
  );
}
