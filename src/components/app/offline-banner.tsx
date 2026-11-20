"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); };
}

/** Shows when the phone or computer loses its connection, and hides itself when it's back. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" data-testid="offline-banner" className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-foreground px-4 py-2 text-center text-sm font-medium text-white">
      <WifiOff className="size-4" aria-hidden />
      You&apos;re offline. We&apos;ll reconnect as soon as you have signal; nothing you&apos;ve sent is lost.
    </div>
  );
}
