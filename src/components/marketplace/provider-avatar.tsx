import { publicMediaUrl } from "@/lib/marketplace/queries";
import { cn } from "@/lib/utils";

export function ProviderAvatar({ name, logoPath, size = "md" }: { name: string; logoPath: string | null; size?: "md" | "lg" }) {
  const url = publicMediaUrl(logoPath);
  const cls = size === "lg" ? "size-16 text-xl" : "size-11 text-sm";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- public logo from storage
    return <img src={url} alt={`${name} logo`} className={cn(cls, "shrink-0 rounded-lg border border-border bg-card object-cover")} />;
  }
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return <span className={cn(cls, "flex shrink-0 items-center justify-center rounded-lg bg-primary-soft font-semibold text-primary")} aria-hidden>{initials}</span>;
}
