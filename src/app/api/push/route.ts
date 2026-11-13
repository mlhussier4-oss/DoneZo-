import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { pushConfigured, sendNotificationPush } from "@/lib/push/send";

/** Called by the database (pg_net) right after a notification is created. Protected by a shared secret. */
export async function POST(request: Request) {
  if (!pushConfigured()) return Response.json({ error: "Push is not configured" }, { status: 503 });
  const given = Buffer.from(request.headers.get("x-push-secret") ?? "");
  const expected = Buffer.from(process.env.PUSH_WEBHOOK_SECRET!);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ notification_id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  return Response.json(await sendNotificationPush(parsed.data.notification_id));
}
