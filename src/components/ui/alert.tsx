import { cn } from "@/lib/utils";

const tones = {
  info: "border-primary/20 bg-primary-soft text-primary-hover",
  success: "border-success/20 bg-success-soft text-success",
  warning: "border-warning/20 bg-warning-soft text-warning",
  error: "border-destructive/20 bg-destructive-soft text-destructive",
} as const;

export function Alert({
  tone = "info",
  className,
  ...props
}: React.ComponentProps<"div"> & { tone?: keyof typeof tones }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone], className)}
      {...props}
    />
  );
}
