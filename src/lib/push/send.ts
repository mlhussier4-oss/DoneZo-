import "server-only";
import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";
import { pushPayload } from "./payload";

export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.PUSH_WEBHOOK_SECRET);
}

/**
 * Sends one in-app notification to every device its owner turned push on for.
 * Called only by /api/push after the shared secret was checked; the notification is read from the database,
 * so callers can't choose what is sent or to whom. Expired subscriptions are removed.
 */
export async function sendNotificationPush(notificationId: string): Promise<{ sent: number; removed: number }> {
  const db = createServiceClient();
  const { data: n } = await db.from("notifications").select("id, user_id, kind, title, body, link, read_at, created_at").eq("id", notificationId).maybeSingle();
  // Old or already-read notifications aren't pushed (e.g. a retried request long after the fact).
  if (!n || n.read_at || Date.now() - new Date(n.created_at).getTime() > 15 * 60_000) return { sent: 0, removed: 0 };
  const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", n.user_id);
  if (!subs?.length) return { sent: 0, removed: 0 };

  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:support@homehire.us", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const payload = pushPayload(n);
  let sent = 0;
  const gone: string[] = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), {
        TTL: payload.urgent ? 300 : 3600,
        urgency: payload.urgent ? "high" : "normal",
      });
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) gone.push(s.id); // the browser unsubscribed or the phone was reset
      else console.error(JSON.stringify({ event: "push_failed", status: status ?? null }));
    }
  }));
  if (gone.length) await db.from("push_subscriptions").delete().in("id", gone);
  return { sent, removed: gone.length };
}
