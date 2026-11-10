"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  fullName: z.string().trim().max(120, "Too long."),
  phone: z.string().trim().max(30, "Too long."),
});

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireRole("customer", "provider", "admin");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "error", fieldErrors };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName || null, phone: parsed.data.phone || null })
    .eq("id", user.id);
  if (error) return { status: "error", message: "Could not save your changes. Please try again." };
  refresh();
  return { status: "success", message: "Saved." };
}
