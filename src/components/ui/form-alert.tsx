import { Alert } from "@/components/ui/alert";
import type { ActionState } from "@/lib/forms";

export function FormAlert({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <Alert tone={state.status === "error" ? "error" : "success"}>{state.message}</Alert>;
}
