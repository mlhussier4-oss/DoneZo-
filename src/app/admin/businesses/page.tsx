import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MarketplaceAccessButton, VerifyButton } from "../admin-buttons";

export const metadata: Metadata = { title: "Businesses" };

export default async function AdminBusinessesPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, email, marketplace_enabled, is_suspended, marketplace_removed_reason, created_at, verified_at, plans ( name )")
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
              <th className="px-4 py-3 font-medium">Verified</th>
              <th className="px-4 py-3 font-medium">Marketplace access</th>
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
                <td className="px-4 py-3"><div className="flex items-center gap-2">{b.verified_at ? <Badge tone="success">Verified</Badge> : null}<VerifyButton businessId={b.id} verified={Boolean(b.verified_at)} /></div></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {b.is_suspended ? <Badge tone="danger" title={b.marketplace_removed_reason ?? undefined}>Removed</Badge> : null}
                    <MarketplaceAccessButton businessId={b.id} removed={b.is_suspended} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
