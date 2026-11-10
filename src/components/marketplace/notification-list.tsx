import Link from "next/link";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { MarkAllReadButton } from "./mark-all-read";

export async function NotificationList({ userId, timeZone }: { userId: string; timeZone: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (!data?.length) return <EmptyState icon={Bell} title="No notifications yet">You&apos;ll see new jobs, bids, messages and updates here.</EmptyState>;
  const unread = data.some((n) => !n.read_at);
  return (
    <div className="space-y-3">
      {unread ? <div className="flex justify-end"><MarkAllReadButton /></div> : null}
      <Card className="divide-y divide-border">
        {data.map((n) => {
          const inner = (
            <div className="flex gap-3 px-4 py-3 sm:px-5">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-accent")} aria-label={n.read_at ? undefined : "Unread"} />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", !n.read_at && "font-semibold")}>{n.title}</p>
                {n.body ? <p className="text-sm text-muted-foreground">{n.body}</p> : null}
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(n.created_at, timeZone)}</p>
              </div>
            </div>
          );
          return n.link ? <Link key={n.id} href={n.link} className="block hover:bg-muted">{inner}</Link> : <div key={n.id}>{inner}</div>;
        })}
      </Card>
    </div>
  );
}
