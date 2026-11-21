"use client";

import { Zap } from "lucide-react";
import { mmss, useSecondsLeft } from "@/components/marketplace/countdown";
import { cn } from "@/lib/utils";

/**
 * HomeHire Priority (owner request 2026-11-21): shown on new jobs during the pro's 5-minute head start,
 * with a live countdown. Hides itself when the head start ends.
 */
export function HeadStartBanner({ until, serverNow, compact = false, className }: { until: string; serverNow: string; compact?: boolean; className?: string }) {
  const left = useSecondsLeft(until, serverNow);
  if (left === 0) return null;
  return (
    <p data-testid="head-start" className={cn(
      "flex items-center gap-1.5 rounded-md bg-cta font-semibold text-cta-foreground",
      compact ? "px-2 py-0.5 text-xs" : "px-3 py-2 text-sm",
      className,
    )}>
      <Zap className={compact ? "size-3.5" : "size-4"} aria-hidden />
      <span>You have a 5-minute head start on your bid!{left !== null ? ` ${mmss(left)} left` : ""}</span>
    </p>
  );
}
