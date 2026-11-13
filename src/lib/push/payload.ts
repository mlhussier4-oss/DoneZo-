/** What a push notification shows. Pure, so it can be unit tested. */
export type PushPayload = { title: string; body: string; url: string; tag: string; urgent: boolean };

/** Time-critical kinds: the provider has 5 minutes to confirm, the customer is waiting on a provider. */
const URGENT = new Set(["booking_pending", "booking_confirmed", "booking_lapsed", "booking_extended"]);

export function pushPayload(n: { id: string; kind: string; title: string; body: string | null; link: string | null }): PushPayload {
  const url = n.link && n.link.startsWith("/") && !n.link.startsWith("//") ? n.link : "/";
  return {
    title: n.title.slice(0, 120),
    body: (n.body ?? "").slice(0, 300),
    url,
    // Messages in the same conversation replace each other instead of piling up; everything else stands alone.
    tag: n.kind === "message" ? `message:${url}` : `${n.kind}:${n.id}`,
    urgent: URGENT.has(n.kind),
  };
}
