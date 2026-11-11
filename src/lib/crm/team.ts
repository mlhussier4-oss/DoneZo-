import "server-only";
import { createClient } from "@/lib/supabase/server";

export type TeamMember = { user_id: string; role: "owner" | "manager" | "employee"; name: string; email: string | null };

/** Everyone on the business's team, with display names (owner first). */
export async function getTeam(businessId: string): Promise<TeamMember[]> {
  const supabase = await createClient();
  const { data: members } = await supabase.from("business_members").select("user_id, role, created_at").eq("business_id", businessId).order("created_at");
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  const order = { owner: 0, manager: 1, employee: 2 } as const;
  return (members ?? [])
    .map((m) => {
      const p = byId.get(m.user_id);
      return { user_id: m.user_id, role: m.role as TeamMember["role"], name: p?.full_name || p?.email || "Team member", email: p?.email ?? null };
    })
    .sort((a, b) => order[a.role] - order[b.role] || a.name.localeCompare(b.name));
}

export const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
