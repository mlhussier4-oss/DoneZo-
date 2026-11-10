import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Messages" };

export default async function CustomerMessagesPage() {
  const user = await requireRole("customer");
  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, request_id, status, created_at, businesses(name), service_requests(service_categories(name)), messages(body, created_at)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });
  const rows = (bookings ?? []).map((b) => {
    const last = [...(b.messages ?? [])].sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
    return { ...b, last };
  });
  return (
    <>
      <PageHeader title="Messages" description="Chat with providers you've hired. Messaging opens once you accept a bid." />
      {!rows.length ? <EmptyState icon={MessageSquare} title="No conversations yet">When you choose a provider, you can message them here.</EmptyState> : (
        <Card className="divide-y divide-border">
          {rows.map((b) => (
            <Link key={b.id} href={`/customer/requests/${b.request_id}#messages`} className="block px-4 py-3 hover:bg-muted sm:px-5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{b.businesses?.name} · {b.service_requests?.service_categories?.name}</p>
                {b.last ? <span className="text-xs text-muted-foreground">{formatDateTime(b.last.created_at, "America/Chicago")}</span> : null}
              </div>
              <p className="truncate text-sm text-muted-foreground">{b.last ? (b.last.body ?? "Photo") : "No messages yet"}</p>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
