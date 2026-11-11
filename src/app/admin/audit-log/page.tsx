import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Audit log" };

export default async function AdminAuditLogPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("admin_audit_log")
    .select("id, actor_id, action, target_type, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const actorIds = [...new Set((entries ?? []).map((e) => e.actor_id).filter(Boolean))] as string[];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, email, full_name").in("id", actorIds)
    : { data: [] };
  const actorName = new Map((actors ?? []).map((a) => [a.id, a.full_name ?? a.email ?? a.id]));

  return (
    <>
      <PageHeader title="Audit log" description="Important admin actions. Entries cannot be edited or deleted." />
      <Card className="overflow-x-auto">
        {entries?.length ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Who</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border align-top last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(e.created_at).toLocaleString("en-US")}</td>
                  <td className="px-4 py-3">{e.actor_id ? actorName.get(e.actor_id) ?? "Unknown" : "System"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{e.action}</td>
                  <td className="px-4 py-3 font-mono text-xs break-all text-muted-foreground">{JSON.stringify(e.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-6 text-sm text-muted-foreground">No admin actions yet.</p>
        )}
      </Card>
    </>
  );
}
