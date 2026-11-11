"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { dbErrorMessage, zodErrors, type ActionState } from "@/lib/forms";
import { supportCategories } from "./categories";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  category: z.enum(supportCategories.map((c) => c.value) as [string, ...string[]], "Choose a topic."),
  subject: z.string().trim().min(1, "Add a short subject.").max(150),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(4000),
});

/** Any signed-in customer, provider or employee can contact support. The database stamps who sent it. */
export async function contactSupport(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireRole("customer", "provider");
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("support_reports").insert(parsed.data as { category: "other"; subject: string; message: string });
  if (error) return { status: "error", message: dbErrorMessage(error, "We couldn't send your message. Please try again.") };
  refresh();
  return { status: "success", message: "Thanks, your message was sent. We'll reply here and notify you." };
}
