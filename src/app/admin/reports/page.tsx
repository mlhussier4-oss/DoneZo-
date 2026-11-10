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
import { ResolveButton } from "../admin-buttons";

export const metadata: Metadata = { title: "Support reports" };

const labels: Record<string, string> = { problem_with_job: "Problem with job", payment: "Payment", safety: "Safety", account: "Account", other: "Other" };

export default async function ReportsPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("support_reports")
    .select("id, category, message, status, admin_note, created_at, reporter_id, booking_id, request_id")
    .order("status")
    .order("created_at", { ascending: false })
    .limit(200);
  const ids = [...new Set((reports ?? []).map((r) => r.reporter_id))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, email, role").in("id", ids) : { data: [] };
  const who = new Map((people ?? []).map((p) => [p.id, `${p.email} (${p.role})`]));
  return (
    <>
      <PageHeader title="Support reports" description="Problems reported by customers and providers." />
      {!reports?.length ? <EmptyState icon={Flag} title="No reports" /> : (
        <Card className="divide-y divide-border">
          {reports.map((r) => (
            <div key={r.id} className="space-y-2 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.status === "open" ? "warning" : "success"} className="capitalize">{r.status}</Badge>
                <span className="font-medium">{labels[r.category]}</span>
                <span className="text-xs text-muted-foreground">{who.get(r.reporter_id)} · {formatDateTime(r.created_at, "America/Chicago")}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{r.message}</p>
              {r.request_id ? <p className="text-xs text-muted-foreground">Request {r.request_id}{r.booking_id ? ` · booking ${r.booking_id}` : ""}</p> : null}
              {r.admin_note ? <p className="text-sm text-muted-foreground">Resolution: {r.admin_note}</p> : null}
              {r.status === "open" ? <ResolveButton reportId={r.id} /> : null}
            </div>
          ))}
        </Card>
      )}
      <p className="mt-4 text-sm text-muted-foreground">Reporters aren&apos;t emailed yet: contact them directly at the email shown. <Link href="/admin/audit-log" className="text-primary hover:underline">Resolutions are logged</Link>.</p>
    </>
  );
}
