import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Rating shown as stars plus the number in text, so it never relies on the icons alone. */
export function Rating({ rating, count, className }: { rating: number | null; count: number; className?: string }) {
  if (!count || rating == null) return <span className={cn("text-sm text-muted-foreground", className)}>No reviews yet</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star className="size-4 fill-warning text-warning" aria-hidden />
      <span className="font-semibold">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground">({count} {count === 1 ? "review" : "reviews"})</span>
    </span>
  );
}
