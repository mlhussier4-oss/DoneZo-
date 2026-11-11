import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { planInfo, type PlanCode } from "@/config/plans";
import { cn } from "@/lib/utils";

/** One plan's name, price and features. The action (sign up, subscribe, switch) goes in `children`. */
export function PlanCard({ plan, highlight, badge, children }: { plan: PlanCode; highlight?: boolean; badge?: string; children?: React.ReactNode }) {
  const p = planInfo[plan];
  return (
    <Card className={cn("flex flex-col", highlight && "border-primary ring-1 ring-primary")} data-testid={`plan-${plan}`}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle as="h2">{p.name}</CardTitle>
          {badge ? <Badge tone="primary">{badge}</Badge> : null}
        </div>
        <CardDescription>{p.tagline}</CardDescription>
        <p className="pt-2"><span className="text-3xl font-bold">{p.price}</span><span className="text-muted-foreground"> / month</span></p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <ul className="space-y-2 text-sm">
          {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{f}</li>)}
        </ul>
        {children ? <div className="mt-auto">{children}</div> : null}
      </CardContent>
    </Card>
  );
}
