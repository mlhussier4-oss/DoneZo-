import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function unreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null);
  return count ?? 0;
}

/** New jobs near this provider they haven't looked at yet (the red badge on "Marketplace"). */
export async function newJobCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("kind", "new_request").is("read_at", null);
  return count ?? 0;
}
