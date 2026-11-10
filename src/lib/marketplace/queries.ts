import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ThreadMessage = { id: string; sender_id: string; body: string | null; photo_url: string | null; created_at: string };

/** Messages on a booking (RLS limits this to the two parties), with short-lived photo links. */
export async function getThread(bookingId: string): Promise<ThreadMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, body, photo_path, created_at")
    .eq("booking_id", bookingId)
    .order("created_at")
    .limit(500);
  const paths = (data ?? []).map((m) => m.photo_path).filter((p): p is string => Boolean(p));
  const signed = paths.length ? ((await supabase.storage.from("message-photos").createSignedUrls(paths, 3600)).data ?? []) : [];
  const url = new Map(signed.map((s) => [s.path, s.signedUrl]));
  return (data ?? []).map((m) => ({
    id: m.id,
    sender_id: m.sender_id,
    body: m.body,
    photo_url: m.photo_path ? (url.get(m.photo_path) ?? null) : null,
    created_at: m.created_at,
  }));
}

export async function signedRequestPhotos(paths: string[]): Promise<string[]> {
  if (!paths.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage.from("request-photos").createSignedUrls(paths, 3600);
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
}

export function publicMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business-media/${path}`;
}
