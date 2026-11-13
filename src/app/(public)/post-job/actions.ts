"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";

export async function checkZip(zip: string): Promise<{ ok: boolean; message?: string }> {
  if (!/^\d{5}$/.test(zip)) return { ok: false, message: "Enter a 5-digit ZIP code." };
  const { data, error } = await createPublicClient().rpc("zip_in_service_area", { p_zip: zip });
  if (error) return { ok: false, message: "Could not check that ZIP code. Please try again." };
  return data ? { ok: true } : { ok: false, message: "DoneZo isn't available there yet. We're starting in the Austin, TX area." };
}

const requestSchema = z
  .object({
    id: z.string().uuid(),
    categoryId: z.string().uuid("Choose a service."),
    description: z.string().trim().min(1, "Describe the job in a few words.").max(2000),
    details: z.record(z.string().max(40), z.string().max(80))
      .refine((d) => Object.keys(d).length <= 6)
      .refine((d) => Object.entries(d).every(([k, v]) => !k.endsWith("_zip") || /^\d{5}$/.test(v)), "Enter 5-digit ZIP codes."),
    timing: z.enum(["asap", "tomorrow", "within_3_days", "this_week", "specific_date"]),
    preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    zip: z.string().regex(/^\d{5}$/, "Enter a 5-digit ZIP code."),
    photoCount: z.number().int().min(1, "Add at least one photo of the job.").max(10),
    line1: z.string().trim().min(1, "Enter the street address.").max(200),
    line2: z.string().trim().max(200),
    city: z.string().trim().min(1, "Enter the city.").max(100),
    phone: z.string().trim().max(30),
    smsConsent: z.boolean(),
  })
  .refine((v) => v.timing !== "specific_date" || v.preferredDate, { message: "Choose a date.", path: ["preferredDate"] });

export type NewRequest = z.input<typeof requestSchema>;

export async function createRequest(input: NewRequest): Promise<{ ok: true; id: string; userId: string } | { ok: false; message: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please confirm your email first." };
  if (user.role !== "customer") {
    return { ok: false, message: "You're signed in with a provider or admin account. Sign in with a customer account to post a job." };
  }
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check your answers." };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("service_requests").insert({
    id: v.id,
    category_id: v.categoryId,
    description: v.description,
    details: v.details,
    timing: v.timing,
    preferred_date: v.timing === "specific_date" ? v.preferredDate : null,
    zip: v.zip,
  });
  if (error) return { ok: false, message: dbErrorMessage(error, "Could not post your job. Please try again.") };
  const { error: locError } = await supabase.from("service_request_locations").insert({
    request_id: v.id,
    line1: v.line1,
    line2: v.line2 || null,
    city: v.city,
    state: "TX",
    phone: v.phone || null,
    sms_consent: v.smsConsent && Boolean(v.phone),
  });
  if (locError) return { ok: false, message: "Your job was posted but the address could not be saved. Please contact support." };
  return { ok: true, id: v.id, userId: user.id };
}

export async function registerRequestPhotos(requestId: string, paths: string[]): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !z.string().uuid().safeParse(requestId).success) return;
  const valid = paths.filter((p) => p.startsWith(`${user.id}/${requestId}/`)).slice(0, 10);
  if (!valid.length) return;
  const supabase = await createClient();
  await supabase.from("request_photos").insert(valid.map((storage_path) => ({ request_id: requestId, storage_path })));
}
