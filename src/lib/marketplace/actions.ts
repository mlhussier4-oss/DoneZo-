"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();

export async function sendMessage(bookingId: string, body: string, photoPath: string | null): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || !uuid.safeParse(bookingId).success) return { error: "Please sign in again." };
  const text = body.trim().slice(0, 4000);
  if (!text && !photoPath) return { error: "Write a message or add a photo." };
  if (photoPath && !photoPath.startsWith(`${bookingId}/`)) return { error: "Invalid photo." };
  const supabase = await createClient();
  // RLS allows this only for the booking's customer and the chosen provider.
  const { error } = await supabase.from("messages").insert({ booking_id: bookingId, body: text || null, photo_path: photoPath });
  if (error) return { error: dbErrorMessage(error, "Could not send your message.") };
  refresh();
  return {};
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  refresh();
}

const reportSchema = z.object({
  bookingId: z.union([z.literal(""), z.string().uuid()]).transform((v) => v || null),
  requestId: z.union([z.literal(""), z.string().uuid()]).transform((v) => v || null),
  category: z.enum(["problem_with_job", "payment", "safety", "account", "other"]),
  message: z.string().trim().min(1, "Tell us what happened.").max(4000),
});

export async function submitReport(_prev: { status: string; message?: string }, fd: FormData): Promise<{ status: "idle" | "success" | "error"; message?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Please sign in again." };
  const parsed = reportSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.from("support_reports").insert({
    booking_id: parsed.data.bookingId,
    request_id: parsed.data.requestId,
    category: parsed.data.category,
    message: parsed.data.message,
  });
  if (error) return { status: "error", message: "Could not send your report. Please try again." };
  return { status: "success", message: "Thanks. Our team will look into it and get back to you." };
}
