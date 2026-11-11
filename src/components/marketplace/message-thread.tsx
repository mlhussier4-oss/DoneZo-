"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Send } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { sendMessage } from "@/lib/marketplace/actions";
import type { ThreadMessage } from "@/lib/marketplace/queries";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

/** Private chat between a customer and the provider they hired. Updates live via Supabase Realtime. */
export function MessageThread({
  bookingId,
  currentUserId,
  otherPartyName,
  messages,
  timeZone,
}: {
  bookingId: string;
  currentUserId: string;
  otherPartyName: string;
  messages: ThreadMessage[];
  timeZone: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let stopped = false;
    // Listen as the signed-in person: load the session first, or the database's privacy rules
    // (which only let the two parties see the chat) would deliver nothing.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (stopped) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`messages:${bookingId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` }, () => router.refresh())
        .subscribe();
    })();
    // Safety net if the live connection drops (e.g. a phone switching networks).
    const poll = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 10_000);
    return () => {
      stopped = true;
      clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [bookingId, router]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  function send(photoPath: string | null = null) {
    start(async () => {
      const r = await sendMessage(bookingId, text, photoPath);
      if (r.error) setError(r.error);
      else { setText(""); setError(undefined); }
    });
  }

  async function sendPhoto(file: File | undefined) {
    if (!file) return;
    const ext = EXT[file.type];
    if (!ext || file.size > 10 * 1024 * 1024) { setError("Use a JPG, PNG, WebP or HEIC photo under 10 MB."); return; }
    const path = `${bookingId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await createBrowserSupabase().storage.from("message-photos").upload(path, file, { contentType: file.type });
    if (upErr) { setError("Could not upload the photo."); return; }
    send(path);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-[28rem] min-h-40 space-y-3 overflow-y-auto rounded-lg bg-muted p-3" aria-live="polite" aria-label="Messages">
        {messages.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Say hello to {otherPartyName}.</p> : null}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-xs", mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-card")}>
                {m.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage
                  <img src={m.photo_url} alt="Shared photo" className="mb-1 max-h-60 rounded-lg" />
                ) : null}
                {m.body ? <p className="whitespace-pre-wrap">{m.body}</p> : null}
                <p className={cn("mt-1 text-[11px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {new Date(m.created_at).toLocaleString("en-US", { timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <Button type="button" variant="outline" aria-label="Attach a photo" disabled={pending} onClick={() => fileInput.current?.click()}>
          <ImagePlus />
        </Button>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" aria-label="Photo to send"
          onChange={(e) => { sendPhoto(e.target.files?.[0]); e.target.value = ""; }} />
        <label htmlFor={`msg-${bookingId}`} className="sr-only">Message</label>
        <Textarea id={`msg-${bookingId}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder={`Message ${otherPartyName}`}
          className="min-h-11 flex-1 resize-none" rows={1}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) send(); } }} />
        <Button type="submit" disabled={pending || !text.trim()} aria-label="Send"><Send /></Button>
      </form>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
