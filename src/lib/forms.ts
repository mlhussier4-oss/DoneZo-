import type { z } from "zod";

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const idle: ActionState = { status: "idle" };

export function zodErrors(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
  return { status: "error", fieldErrors, message: "Please fix the highlighted fields." };
}

/** Turn a database error into a message a business owner can act on. */
export function dbErrorMessage(error: { message: string; code?: string } | null, fallback: string): string {
  if (!error) return fallback;
  // Messages raised deliberately by our database rules are written for people; show them.
  if (error.code === "42501" || error.code === "P0001") return error.message;
  return fallback;
}
