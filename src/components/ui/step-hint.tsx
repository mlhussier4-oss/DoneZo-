import { cn } from "@/lib/utils";

/**
 * Small red one-line "what to do now / what happens next" hint (owner request 2026-11-20): shown at every
 * customer and provider step so nobody is ever unsure what's going on. Colour: the --hint token in globals.css.
 */
export function StepHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p data-testid="step-hint" className={cn("text-xs leading-snug font-medium text-hint", className)}>{children}</p>;
}
