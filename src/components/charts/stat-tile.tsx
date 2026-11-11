import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

/** Stat tile: label · value · optional context line. Text uses text tokens only. */
export function StatTile({ label, value, context, href }: { label: string; value: string; context?: string; href?: string }) {
  const body = (
    <Card className={href ? "h-full border-t-4 border-t-primary transition-shadow hover:shadow-md" : "h-full border-t-4 border-t-primary"}>
      <CardContent className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-primary sm:text-3xl">{value}</p>
        {context ? <p className="text-xs text-muted-foreground">{context}</p> : null}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}
