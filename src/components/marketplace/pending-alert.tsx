"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BellRing } from "lucide-react";
import { pendingConfirmations } from "@/app/provider/marketplace/actions";
import { CountdownClock, useSecondsLeft } from "./countdown";

type Item = { id: string; confirmBy: string; label: string };

function Row({ item, serverNow }: { item: Item; serverNow: string }) {
  const left = useSecondsLeft(item.confirmBy, serverNow);
  return (
    <Link href={`/provider/marketplace/bookings/${item.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20">
      <span className="text-sm"><span className="font-semibold">You were chosen!</span> {item.label}. Tap to confirm.</span>
      <CountdownClock seconds={left} className="text-xl !text-cta" />
    </Link>
  );
}

/**
 * Owner decision 2026-11-12: a provider has 5 minutes to confirm a job they were chosen for. This checks every
 * few seconds on every provider page, shows a banner with the countdown, and plays a short chime for new ones.
 */
export function PendingAlert() {
  const [data, setData] = useState<{ serverNow: string; items: Item[] }>({ serverNow: "", items: [] });
  const seen = useRef<Set<string>>(new Set());
  const pathname = usePathname();
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const next = await pendingConfirmations();
        if (!alive) return;
        const fresh = next.items.filter((i) => !seen.current.has(i.id));
        if (fresh.length) chime();
        fresh.forEach((i) => seen.current.add(i.id));
        setData(next);
      } catch {
        /* offline: try again next time */
      }
    };
    load();
    const id = setInterval(load, 8000);
    return () => { alive = false; clearInterval(id); };
  }, [pathname]);
  if (!data.items.length) return null;
  return (
    <div role="alert" className="mb-6 space-y-2 rounded-xl bg-primary p-4 text-white shadow-lg ring-2 ring-cta" data-testid="pending-alert">
      <p className="flex items-center gap-2 font-semibold"><BellRing className="size-5 text-cta" aria-hidden />A customer picked your bid</p>
      {data.items.map((i) => <Row key={i.id} item={i} serverNow={data.serverNow} />)}
    </div>
  );
}

function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1175].forEach((hz, n) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = hz;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + n * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.start(t);
      o.stop(t + 0.32);
    });
  } catch {
    /* browsers block sound until the page has been tapped; the banner still shows */
  }
}
