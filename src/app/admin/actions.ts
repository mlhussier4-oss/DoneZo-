"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { CATEGORIES_TAG } from "@/lib/data/categories";
import { createClient } from "@/lib/supabase/server";

export type AdminState = { status: "idle" | "success" | "error"; message?: string };

const categorySchema = z.object({
  id: z.union([z.literal(""), z.string().uuid()]),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only.").max(60),
  name: z.string().trim().min(1, "Enter a name.").max(80),
  description: z.string().trim().max(500),
  icon: z.string().trim().regex(/^[a-z0-9-]+$/),
  sortOrder: z.coerce.number().int().min(0).max(1000),
  isActive: z.enum(["true", "false"]),
});

export async function saveCategory(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireRole("admin");
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form." };
  const v = parsed.data;
  const supabase = await createClient();
  // The database function re-checks admin rights and writes the audit log.
  const { error } = await supabase.rpc("admin_upsert_service_category", {
    // NULL id means "create"; generated types don't model nullable function arguments.
    p_id: (v.id || null) as string,
    p_slug: v.slug,
    p_name: v.name,
    p_description: (v.description || null) as string,
    p_icon: v.icon,
    p_sort_order: v.sortOrder,
    p_is_active: v.isActive === "true",
  });
  if (error) {
    return { status: "error", message: error.code === "23505" ? "That slug is already used by another category." : "Could not save the category." };
  }
  updateTag(CATEGORIES_TAG);
  refresh();
  return { status: "success", message: v.id ? "Category updated." : "Category added." };
}

export async function setUserSuspended(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireRole("admin");
  const parsed = z
    .object({ userId: z.string().uuid(), suspended: z.enum(["true", "false"]), reason: z.string().trim().max(500) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_suspended", {
    p_user_id: parsed.data.userId,
    p_suspended: parsed.data.suspended === "true",
    p_reason: parsed.data.reason,
  });
  if (error) return { status: "error", message: error.message.includes("themselves") ? "You can't suspend your own account." : "Could not update the user." };
  refresh();
  return { status: "success", message: parsed.data.suspended === "true" ? "User suspended." : "User reinstated." };
}
