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

const areaSchema = z.object({
  id: z.union([z.literal(""), z.string().uuid()]),
  name: z.string().trim().min(1, "Enter a name.").max(80),
  centerZip: z.string().regex(/^\d{5}$/, "Enter a 5-digit ZIP."),
  radius: z.coerce.number().int().min(1).max(150),
  isActive: z.enum(["true", "false"]),
});

export async function saveServiceArea(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireRole("admin");
  const parsed = areaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const v = parsed.data;
  const { error } = await (await createClient()).rpc("admin_upsert_service_area", {
    p_id: (v.id || null) as string,
    p_name: v.name,
    p_center_zip: v.centerZip,
    p_radius_miles: v.radius,
    p_is_active: v.isActive === "true",
  });
  if (error) return { status: "error", message: error.code === "23503" ? "That ZIP code isn't recognized." : "Could not save the service area." };
  refresh();
  return { status: "success", message: "Saved." };
}

export async function setBusinessVerified(businessId: string, verified: boolean, note: string): Promise<AdminState> {
  await requireRole("admin");
  if (!z.string().uuid().safeParse(businessId).success) return { status: "error", message: "Unknown business." };
  const { error } = await (await createClient()).rpc("admin_set_business_verified", { p_business_id: businessId, p_verified: verified, p_note: note });
  if (error) return { status: "error", message: "Could not update verification." };
  refresh();
  return { status: "success" };
}

export async function resolveReport(reportId: string, note: string): Promise<AdminState> {
  await requireRole("admin");
  if (!z.string().uuid().safeParse(reportId).success) return { status: "error", message: "Unknown report." };
  const { error } = await (await createClient()).rpc("admin_resolve_report", { p_report_id: reportId, p_note: note });
  if (error) return { status: "error", message: "Could not resolve the report." };
  refresh();
  return { status: "success" };
}

export async function setCardFee(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireRole("admin");
  const pct = Number(String(formData.get("percent") ?? "").replace("%", ""));
  if (!Number.isFinite(pct) || pct < 0 || pct > 30) return { status: "error", message: "Enter a percentage between 0 and 30." };
  const { error } = await (await createClient()).rpc("admin_set_card_fee", { p_bps: Math.round(pct * 100) });
  if (error) return { status: "error", message: "Could not save the fee." };
  refresh();
  return { status: "success", message: "Saved. New card payment links use this fee." };
}
