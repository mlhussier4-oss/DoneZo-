"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { setUserSuspended, type AdminState } from "../actions";

export function SuspendButton({ userId, suspended }: { userId: string; suspended: boolean }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(setUserSuspended, { status: "idle" });
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!suspended && !confirm("Suspend this user? They will be signed out and unable to use DoneZo.")) e.preventDefault();
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="suspended" value={suspended ? "false" : "true"} />
      <input type="hidden" name="reason" value="" />
      <Button type="submit" size="sm" variant={suspended ? "outline" : "ghost"} disabled={pending}>
        {suspended ? "Reinstate" : "Suspend"}
      </Button>
      {state.status === "error" ? <span className="text-xs text-destructive">{state.message}</span> : null}
    </form>
  );
}
