import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Provider says they carry liability insurance (self-reported; owner request 2026-11-14). Not checked by HomeHire. */
export function InsuredBadge() {
  return (
    <Badge tone="primary" title="This provider says they carry liability insurance. HomeHire hasn't checked their policy.">
      <ShieldCheck className="size-3.5" aria-hidden />Insured
    </Badge>
  );
}
