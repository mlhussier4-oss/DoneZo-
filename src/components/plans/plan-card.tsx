import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { planInfo, type PlanCode } from "@/config/plans";
import { cn } from "@/lib/utils";

/** One plan's name, price and features. The action (sign up, subscribe, switch) goes in `children`. */
export function PlanCard({ plan, highlight, badge, children }: { plan: PlanCode; highlight?: boolean; badge?: string; children?: React.ReactNode }) {
  const p = planInfo[plan];
  return (
    <Card className={cn("flex min-w-0 flex-col", highlight && "border-primary ring-1 ring-primary")} data-testid={`plan-${plan}`}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle as="h2">{p.name}</CardTitle>
          {badge ? <Badge tone="primary">{badge}</Badge> : null}
        </div>
        <CardDescription>{p.tagline}</CardDescription>
        <p className="pt-2"><span className="text-3xl font-bold">{p.price}</span><span className="text-muted-foreground"> / month</span></p>
        {p.yearly ? <p className="text-sm text-muted-foreground">or {p.yearly} / year: pay for 12 months, get 2 free</p> : <p className="text-sm text-muted-foreground">Monthly plan. Cancel any time.</p>}
        {plan === "basic" ? <p className="text-sm font-semibold text-success">First month free</p> : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <ul className="space-y-2 text-sm">
          {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{f}</li>)}
        </ul>
        {/* Buttons inside a plan tile wrap onto two lines instead of running past the edge on narrow (3-across) tiles. */}
        {children ? <div className="mt-auto min-w-0 [&_:is(a,button)]:h-auto [&_:is(a,button)]:min-h-10 [&_:is(a,button)]:py-2 [&_:is(a,button)]:text-center [&_:is(a,button)]:whitespace-normal">{children}</div> : null}
      </CardContent>
    </Card>
  );
}
