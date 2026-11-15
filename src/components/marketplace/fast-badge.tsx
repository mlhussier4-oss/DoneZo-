import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Usually confirms a picked job within 2 minutes (3+ confirmed jobs in the last 6 months; owner request 2026-11-15). */
export function RespondsFastBadge() {
  return (
    <Badge tone="warning" title="Usually confirms within 2 minutes of being picked.">
      <Zap className="size-3.5" aria-hidden />Responds fast
    </Badge>
  );
}
