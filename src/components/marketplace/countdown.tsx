"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Seconds left until `deadline`, corrected for the difference between this device's clock and the server's
 * (`serverNow` is the server time when the page was rendered). Calls `onZero` once when time runs out.
 */
export function useSecondsLeft(deadline: string, serverNow: string, onZero?: () => void) {
  const [left, setLeft] = useState<number | null>(null);
  const fired = useRef(false);
  useEffect(() => {
    const offset = Date.parse(serverNow) - Date.now();
    const tick = () => {
      const s = Math.max(0, Math.ceil((Date.parse(deadline) - (Date.now() + offset)) / 1000));
      setLeft(s);
      if (s === 0 && !fired.current) { fired.current = true; onZero?.(); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the deadline changes
  }, [deadline, serverNow]);
  return left;
}

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function CountdownClock({ seconds, className }: { seconds: number | null; className?: string }) {
  const urgent = seconds !== null && seconds <= 120;
  return (
    <span
      role="timer"
      aria-live="off"
      aria-label={seconds === null ? "Loading time left" : `${mmss(seconds)} left`}
      className={cn("font-mono text-3xl font-bold tabular-nums", urgent ? "text-destructive" : "text-primary", className)}
    >
      {seconds === null ? "–:––" : mmss(seconds)}
    </span>
  );
}
