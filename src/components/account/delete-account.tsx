"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { deleteMyAccount } from "@/lib/account/actions";

/** "Delete my account" with a typed confirmation (owner request 2026-11-15; Apple requires it). */
export function DeleteAccount({ who }: { who: "customer" | "provider" }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteMyAccount, {});
  if (!open) {
    return <Button variant="ghost" size="sm" onClick={() => setOpen(true)}><Trash2 /> Delete my account</Button>;
  }
  return (
    <form action={action} className="space-y-3 rounded-lg border border-destructive/40 p-4" data-testid="delete-account">
      <p className="font-semibold text-destructive">Delete your HomeHire account?</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Your name, email, photo and login are removed, and you&apos;re signed out. This can&apos;t be undone.</li>
        {who === "customer"
          ? <li>Open job posts are cancelled. Past invoices stay with the pros you hired, for their records, without your details.</li>
          : <li>Your subscription is cancelled and your business is removed from the marketplace. Payment and invoice records are kept as the law requires.</li>}
        <li>You can sign up again later with the same email.</li>
      </ul>
      <Field label="Type DELETE to confirm" htmlFor="confirm-delete">
        <Input id="confirm-delete" name="confirm" autoComplete="off" />
      </Field>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={pending}>{pending ? "Deleting…" : "Delete my account"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Keep my account</Button>
      </div>
    </form>
  );
}
