"use client";

import { useFormStatus } from "react-dom";
import { useFormPending } from "@/components/ui/form";
import { Button, type ButtonProps } from "@/components/ui/button";

export function SubmitButton({ children, pendingText, ...props }: ButtonProps & { pendingText?: string }) {
  const status = useFormStatus();
  const pending = useFormPending() ?? status.pending;
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-disabled={pending} {...props}>
      {pending ? (pendingText ?? "Saving…") : children}
    </Button>
  );
}
