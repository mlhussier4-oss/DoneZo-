import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SuspendButton } from "./suspend-button";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const me = await requireRole("admin");
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, is_suspended, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <PageHeader title="Users" description="The 200 most recent accounts." />
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{u.full_name ?? "—"}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3 whitespace-nowrap">{new Date(u.created_at).toLocaleDateString("en-US")}</td>
                <td className="px-4 py-3">{u.is_suspended ? <Badge tone="danger">Suspended</Badge> : <Badge tone="success">Active</Badge>}</td>
                <td className="px-4 py-3">{u.id !== me.id ? <SuspendButton userId={u.id} suspended={u.is_suspended} /> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
