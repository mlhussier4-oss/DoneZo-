"use client";

import { useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hideJob, unhideJob } from "./actions";

/** Owner request 2026-11-12: providers can hide a job so it stops showing on their board (and undo it). */
export function HideJobButton({ requestId, hidden = false }: { requestId: string; hidden?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant={hidden ? "outline" : "ghost"}
      disabled={pending}
      aria-label={hidden ? "Show this job again" : "Hide this job"}
      onClick={() => start(async () => { await (hidden ? unhideJob(requestId) : hideJob(requestId)); })}
    >
      {hidden ? <><Eye /> Unhide</> : <><EyeOff /> Hide</>}
    </Button>
  );
}
