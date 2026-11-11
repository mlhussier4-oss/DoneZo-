import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RequestList, requestListSelect, type RequestRow } from "./request-list";

export const metadata: Metadata = { title: "My requests" };

export default async function CustomerRequestsPage() {
  const user = await requireRole("customer");
  const supabase = await createClient();
  const { data } = await supabase.from("service_requests").select(requestListSelect).eq("customer_id", user.id).order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as RequestRow[];
  return (
    <>
      <PageHeader title="My requests" actions={<Link href="/post-job" className={buttonVariants({ variant: "accent" })}><Plus /> Post a job</Link>} />
      {rows.length ? <RequestList rows={rows} /> : (
        <EmptyState icon={ClipboardList} title="No requests yet" action={<Link href="/post-job" className={buttonVariants({ variant: "accent", size: "sm" })}>Post your first job</Link>}>
          Post a job and nearby providers will send you bids.
        </EmptyState>
      )}
    </>
  );
}
