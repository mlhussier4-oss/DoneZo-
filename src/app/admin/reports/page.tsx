import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Flag } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { supportCategoryLabel } from "@/lib/support/categories";
import { ResolveButton } from "../admin-buttons";

export const metadata: Metadata = { title: "Support reports" };


export default async function ReportsPage() {
  await requireRole("admin");
  const supabase = await createClient();
  // Open requests first (newest first), then the most recently answered, so an answered request never drops out of view.
  const cols = "id, category, subject, message, status, admin_note, created_at, reporter_id, booking_id, request_id";
  const [{ data: open }, { data: answered }] = await Promise.all([
    supabase.from("support_reports").select(cols).eq("status", "open").order("created_at", { ascending: false }).limit(200),
    supabase.from("support_reports").select(cols).eq("status", "resolved").order("resolved_at", { ascending: false }).limit(50),
  ]);
  const reports = [...(open ?? []), ...(answered ?? [])];
  const ids = [...new Set((reports ?? []).map((r) => r.reporter_id))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, email, role").in("id", ids) : { data: [] };
  const who = new Map((people ?? []).map((p) => [p.id, `${p.email} (${p.role})`]));
  return (
    <>
      <PageHeader title="Support inbox" description="Questions and problems from customers and providers. Open requests first." />
      {!reports?.length ? <EmptyState icon={Flag} title="No reports" /> : (
        <Card className="divide-y divide-border">
          {reports.map((r) => (
            <div key={r.id} className="space-y-2 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.status === "open" ? "warning" : "success"} className="capitalize">{r.status}</Badge>
                <span className="font-medium">{r.subject ?? supportCategoryLabel(r.category)}</span>
                <Badge>{supportCategoryLabel(r.category)}</Badge>
                <span className="text-xs text-muted-foreground">{who.get(r.reporter_id)} · {formatDateTime(r.created_at, "America/Chicago")}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{r.message}</p>
              {r.request_id ? <p className="text-xs text-muted-foreground">Request {r.request_id}{r.booking_id ? ` · booking ${r.booking_id}` : ""}</p> : null}
              {r.admin_note ? <p className="text-sm text-muted-foreground">Reply: {r.admin_note}</p> : null}
              {r.status === "open" ? <ResolveButton reportId={r.id} /> : null}
            </div>
          ))}
        </Card>
      )}
      <p className="mt-4 text-sm text-muted-foreground">Replies appear on the person&apos;s Help page with an in-app notification (not by email yet). <Link href="/admin/audit-log" className="text-primary hover:underline">Replies are logged</Link>.</p>
    </>
  );
}
