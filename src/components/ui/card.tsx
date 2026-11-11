import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("space-y-1 p-5 pb-0 sm:p-6 sm:pb-0", className)} {...props} />;
}

/** Card heading. Pass `as="h1"` when the card is the page's main content (e.g. sign-in pages). */
export function CardTitle({ className, as: Tag = "h3", ...props }: React.ComponentProps<"h3"> & { as?: "h1" | "h2" | "h3" }) {
  return <Tag className={cn("text-lg font-semibold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}
