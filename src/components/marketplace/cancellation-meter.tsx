import { cn } from "@/lib/utils";

/**
 * Cancellation record (owner decision 2026-11-14): each cancellation after a confirmed booking within 6 months fills
 * one segment: 1 yellow, 2 orange, 3 red. The 3rd removes marketplace access until HomeHire support restores it.
 */
const COLORS = ["bg-yellow-400", "bg-orange-500", "bg-red-600"];
const LABELS = ["", "Yellow", "Orange", "Red"];

export function CancellationMeter({ count, blocked, who }: { count: number; blocked: boolean; who: "customer" | "provider" }) {
  const n = Math.min(blocked ? 3 : count, 3);
  const message = blocked || n >= 3
    ? who === "customer"
      ? "Your marketplace access is paused after 3 cancellations within 6 months. Contact support to talk it through."
      : "Your business was removed from the marketplace after 3 cancellations within 6 months. Your business tools still work. Contact support."
    : n === 2
      ? "2 cancellations in the last 6 months. One more and you'll lose access to the marketplace."
      : n === 1
        ? "1 cancellation in the last 6 months. 3 within 6 months removes marketplace access."
        : "No cancellations in the last 6 months. Thanks for being reliable!";
  return (
    <div className="space-y-2" data-testid="cancellation-meter" data-level={n}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">Cancellation record</span>
        {n ? <span className="text-xs font-semibold uppercase tracking-wide">{LABELS[n]}</span> : null}
      </div>
      <div className="flex gap-1.5" role="meter" aria-valuemin={0} aria-valuemax={3} aria-valuenow={n} aria-label={`${n} of 3 cancellations in 6 months`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("h-2.5 flex-1 rounded-full", i < n ? COLORS[n - 1] : "bg-muted")} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{message} Only cancellations after a pro has confirmed the job count.</p>
    </div>
  );
}
