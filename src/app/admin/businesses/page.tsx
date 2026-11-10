import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Businesses" };

export default async function AdminBusinessesPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, email, marketplace_enabled, created_at, plans ( name )")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <PageHeader title="Businesses" description="Provider accounts. Customer records stay private to each business and are not shown here." />
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Account type</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {(businesses ?? []).map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3">{b.email ?? "—"}</td>
                <td className="px-4 py-3">
                  {b.marketplace_enabled ? <Badge tone="primary">CRM + Marketplace</Badge> : <Badge>CRM only</Badge>}
                </td>
                <td className="px-4 py-3">{(b.plans as unknown as { name: string } | null)?.name ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{new Date(b.created_at).toLocaleDateString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
