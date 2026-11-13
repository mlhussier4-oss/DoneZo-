"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const subSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Saves this browser's push subscription for the signed-in person (guests included). RLS keeps it to their own rows. */
export async function savePushSubscription(sub: unknown, userAgent: string): Promise<{ error?: string }> {
  const parsed = subSchema.safeParse(sub);
  if (!parsed.success) return { error: "This browser gave an unexpected subscription." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in first." };
  const { endpoint, keys } = parsed.data;
  const { error } = await supabase.rpc("register_push_subscription", { p_endpoint: endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth, p_user_agent: userAgent.slice(0, 300) });
  if (error) return { error: "Could not turn on notifications." };
  return {};
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  if (typeof endpoint !== "string" || endpoint.length > 1000) return;
  await (await createClient()).from("push_subscriptions").delete().eq("endpoint", endpoint);
}
