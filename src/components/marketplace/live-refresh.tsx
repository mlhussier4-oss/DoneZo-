"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-reads the page from the server every few seconds (while the tab is visible), so new bids and status changes appear live. */
export function LiveRefresh({ everyMs = 5000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, everyMs);
    const onVisible = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [router, everyMs]);
  return null;
}
