import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Clearly marks a section that is NOT built yet (Blueprint rule 11:
 * placeholders must be identified). Never shows fake data.
 */
export function ComingSoon({ title, phase, children }: { title: string; phase: string; children?: React.ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Construction className="size-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">Not built yet. Planned for {phase}.</p>
        </div>
        {children ? <div className="max-w-md text-sm text-muted-foreground">{children}</div> : null}
      </CardContent>
    </Card>
  );
}
