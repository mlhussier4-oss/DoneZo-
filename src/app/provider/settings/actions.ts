"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireProvider } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string> };

const detailsSchema = z.object({
  name: z.string().trim().min(1, "Enter your business name.").max(120),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email.").max(254)]),
  phone: z.string().trim().max(30, "Too long."),
  description: z.string().trim().max(2000, "Keep it under 2,000 characters."),
});

export async function updateBusinessDetails(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { business } = await requireProvider();
  if (business.memberRole === "employee") return { status: "error", message: "Only the owner or a manager can change these details." };

  const parsed = detailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "error", fieldErrors };
  }
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({ name: v.name, email: v.email || null, phone: v.phone || null, description: v.description || null })
    .eq("id", business.id);
  if (error) return { status: "error", message: "Could not save your changes. Please try again." };
  refresh();
  return { status: "success", message: "Saved." };
}

export async function setMarketplaceEnabled(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { business } = await requireProvider();
  const enabled = formData.get("enabled") === "true";
  const supabase = await createClient();
  // The database function re-checks that this user is an owner/manager of this business.
  const { error } = await supabase.rpc("set_marketplace_enabled", { p_business_id: business.id, p_enabled: enabled });
  if (error) return { status: "error", message: "Could not change marketplace access. Only the owner or a manager can do this." };
  refresh();
  return {
    status: "success",
    message: enabled ? "Marketplace access is on." : "Marketplace access is off. Your customers, jobs and invoices are unchanged.",
  };
}
