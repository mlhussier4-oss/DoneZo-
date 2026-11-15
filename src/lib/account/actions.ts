"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Delete my account (owner request 2026-11-15; required by Apple). The database removes personal details and checks
 * nothing is in progress; then the login itself is retired (email freed, password scrambled, sign-in blocked),
 * the profile photo is deleted and, for a business owner, the Stripe subscription is cancelled.
 */
export async function deleteMyAccount(_prev: { error?: string }, fd: FormData): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  if (String(fd.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") return { error: "Type DELETE to confirm." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_my_account");
  if (error) return { error: error.code === "P0001" ? error.message : "Could not delete your account. Please contact support." };
  const result = (data ?? {}) as { avatar_path?: string | null; stripe_subscription_id?: string | null };

  const admin = createServiceClient();
  if (result.avatar_path) await admin.storage.from("avatars").remove([result.avatar_path]);
  if (result.stripe_subscription_id) await stripe().subscriptions.cancel(result.stripe_subscription_id).catch(() => undefined);
  await admin.auth.admin.updateUserById(user.id, {
    email: `deleted+${user.id}@users.homehire.us`,
    email_confirm: true,
    password: `${randomUUID()}${randomUUID()}`,
    user_metadata: {},
    ban_duration: "876000h",
  });
  await supabase.auth.signOut();
  redirect("/account-deleted");
}
