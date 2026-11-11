import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { RequestList, requestListSelect, requestState, type RequestRow } from "./requests/request-list";

export const metadata: Metadata = { title: "My account" };

export default async function CustomerHomePage() {
  const user = await requireRole("customer");
  const supabase = await createClient();
  const [{ data }, { data: invoices }] = await Promise.all([
    supabase.from("service_requests").select(requestListSelect).eq("customer_id", user.id).order("created_at", { ascending: false }).limit(50),
    supabase.rpc("customer_invoices"),
  ]);
  const rows = (data ?? []) as unknown as RequestRow[];
  const active = rows.filter((r) => ["Waiting for bids", "Booked"].includes(requestState(r).label) || requestState(r).label.endsWith("bid") || requestState(r).label.endsWith("bids"));
  const due = (invoices ?? []).filter((i) => i.status === "sent" || i.status === "partially_paid");
  const firstName = user.fullName?.split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Hi, ${firstName}` : "Welcome"}
        description="Your jobs, bids and payments."
        actions={<Link href="/post-job" className={buttonVariants({ variant: "accent" })}><Plus /> Post a job</Link>}
      />
      {due.length ? (
        <Card className="mb-6 border-warning/30 bg-warning-soft">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">You have {due.length} unpaid {due.length === 1 ? "invoice" : "invoices"}: {formatMoney(due.reduce((s, i) => s + i.total_cents - i.amount_paid_cents, 0))}</p>
            <Link href="/customer/payments" className={buttonVariants({ size: "sm", variant: "outline" })}>View</Link>
          </CardContent>
        </Card>
      ) : null}
      <h2 className="mb-3 font-semibold">Active</h2>
      {active.length ? <RequestList rows={active} /> : (
        <EmptyState icon={ClipboardList} title="Nothing in progress" action={<Link href="/post-job" className={buttonVariants({ variant: "accent", size: "sm" })}>Post a job</Link>}>
          Post a job and nearby providers will send you bids. No card needed.
        </EmptyState>
      )}
      {rows.length > active.length ? (
        <p className="mt-4 text-sm"><Link href="/customer/requests" className="text-primary hover:underline">See all your requests →</Link></p>
      ) : null}
    </>
  );
}
