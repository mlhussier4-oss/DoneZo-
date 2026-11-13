"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePushSubscription, savePushSubscription } from "@/lib/push/actions";

type State = "loading" | "unsupported" | "ios-install" | "blocked" | "off" | "on";

const DISMISS_KEY = "donezo-push-dismissed";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** "granted" | "denied" | "default". Prefers the Permissions API, which some browsers keep more up to date. */
async function permissionState(): Promise<NotificationPermission> {
  try {
    const q = await navigator.permissions.query({ name: "notifications" as PermissionName });
    return q.state === "prompt" ? "default" : q.state;
  } catch {
    return Notification.permission;
  }
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return { reg, sub: await reg.pushManager.getSubscription() };
}

/**
 * "Turn on notifications" (owner request 2026-11-13). `variant="banner"` is the dismissible prompt shown on dashboards;
 * `variant="setting"` is the always-available switch. iPhones need DoneZo added to the Home Screen first.
 */
export function PushToggle({ text, variant = "banner" }: { text: string; variant?: "banner" | "setting" }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [dismissed, setDismissed] = useState(true);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: State;
      try { setDismissed(variant === "banner" && localStorage.getItem(DISMISS_KEY) === "1"); } catch { setDismissed(false); }
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (!publicKey) next = "unsupported";
      else if (ios && !standalone) next = "ios-install";
      else if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) next = "unsupported";
      else {
        const permission = await permissionState();
        if (permission === "denied") next = "blocked";
        else {
          try { next = (await currentSubscription()).sub && permission === "granted" ? "on" : "off"; } catch { next = "unsupported"; }
        }
      }
      if (!cancelled) setState(next);
    })();
    return () => { cancelled = true; };
  }, [publicKey, variant]);

  async function turnOn() {
    setBusy(true); setError(undefined);
    try {
      const permission = (await permissionState()) === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") { setState(permission === "denied" ? "blocked" : "off"); return; }
      const { reg } = await currentSubscription();
      const sub = (await reg.pushManager.getSubscription())
        ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey!) });
      const r = await savePushSubscription(sub.toJSON(), navigator.userAgent);
      if (r.error) { setError(r.error); return; }
      setState("on");
    } catch {
      setError("Couldn't turn on notifications in this browser.");
    } finally { setBusy(false); }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const { sub } = await currentSubscription();
      if (sub) { await deletePushSubscription(sub.endpoint); await sub.unsubscribe(); }
      setState("off");
    } finally { setBusy(false); }
  }

  if (state === "loading" || state === "unsupported") return null;

  if (variant === "banner") {
    if (dismissed || state === "on" || state === "blocked") return null;
    const dismiss = () => { try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* private mode */ } setDismissed(true); };
    return (
      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border border-l-4 border-l-cta bg-card p-4 shadow-sm sm:flex-row sm:items-center" data-testid="push-prompt">
        <BellRing className="hidden size-5 shrink-0 text-primary sm:block" aria-hidden />
        <div className="flex-1 text-sm">
          <p className="font-semibold">{state === "ios-install" ? "Get notifications on your iPhone" : "Get a notification, even when DoneZo is closed"}</p>
          <p className="text-muted-foreground">
            {state === "ios-install"
              ? <>Tap the <strong>Share</strong> button, choose <strong>Add to Home Screen</strong>, then open DoneZo from your home screen and turn notifications on.</>
              : text}
          </p>
          {error ? <p className="mt-1 text-destructive">{error}</p> : null}
        </div>
        <div className="flex gap-2">
          {state === "off" ? <Button size="sm" variant="accent" disabled={busy} onClick={turnOn}>{busy ? "Turning on…" : "Turn on notifications"}</Button> : null}
          <Button size="sm" variant="ghost" aria-label="Not now" onClick={dismiss}><X /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm" data-testid="push-setting">
      {state === "on" ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 font-medium"><BellRing className="size-4 text-success" aria-hidden /> Notifications are on for this device</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={turnOff}><BellOff /> Turn off</Button>
        </div>
      ) : state === "blocked" ? (
        <p className="text-muted-foreground">Notifications are blocked for DoneZo in this browser. Allow them in your browser&apos;s site settings, then reload.</p>
      ) : state === "ios-install" ? (
        <p className="text-muted-foreground">On iPhone, tap <strong>Share</strong> → <strong>Add to Home Screen</strong>, then open DoneZo from your home screen to turn notifications on.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground">{text}</span>
          <Button size="sm" variant="accent" disabled={busy} onClick={turnOn}><BellRing /> Turn on notifications</Button>
        </div>
      )}
      {error ? <p className="text-destructive">{error}</p> : null}
    </div>
  );
}
