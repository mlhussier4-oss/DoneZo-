"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { firstNameSchema } from "@/lib/validation/names";

export type ProfileState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string> };

function errorsOf(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return fieldErrors;
}

/** First name only (owner decision 2026-11-13). */
export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireRole("customer");
  const parsed = z.object({ firstName: firstNameSchema }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: errorsOf(parsed.error) };
  const { error } = await (await createClient()).from("profiles").update({ full_name: parsed.data.firstName }).eq("id", user.id);
  if (error) return { status: "error", message: "Could not save your changes. Please try again." };
  refresh();
  return { status: "success", message: "Saved." };
}

/** Points the profile at a photo the customer just uploaded to their own folder, and removes the old one. */
export async function setAvatar(path: string | null): Promise<{ error?: string }> {
  const user = await requireRole("customer");
  if (path !== null && !new RegExp(`^${user.id}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(path)) return { error: "That photo couldn't be used." };
  const supabase = await createClient();
  const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  if (error) return { error: "Could not save your photo." };
  if (before?.avatar_path && before.avatar_path !== path) await supabase.storage.from("avatars").remove([before.avatar_path]);
  refresh();
  return {};
}

const saveSchema = z.object({
  firstName: firstNameSchema,
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Use at least 8 characters.").max(72).refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Use at least one letter and one number."),
});

/** A guest from before accounts were required keeps their jobs by adding an email and password. */
export async function saveGuestAccount(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireRole("customer");
  if (user.email) return { status: "error", message: "Your account is already saved." };
  const parsed = saveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: errorsOf(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email, password: parsed.data.password },
    { emailRedirectTo: `${publicEnv.siteUrl()}/auth/confirm?next=/customer` },
  );
  if (error) {
    return { status: "error", message: /already|registered|exists/i.test(error.message) ? "That email already has a HomeHire account. Log in with it instead." : "Could not save your account. Please try again." };
  }
  await supabase.from("profiles").update({ full_name: parsed.data.firstName }).eq("id", user.id);
  refresh();
  return { status: "success", message: `Almost done: we sent a link to ${parsed.data.email}. Tap it to confirm, and you can log in on any device.` };
}
