import { avatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/** A customer's photo, or the first letter of their first name. */
export function Avatar({ path, name, size = "md", className }: { path?: string | null; name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const url = avatarUrl(path);
  const box = size === "sm" ? "size-8 text-sm" : size === "lg" ? "size-20 text-2xl" : "size-10 text-base";
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- small, already-resized image from storage
    <img src={url} alt={`${name}'s photo`} className={cn("shrink-0 rounded-full object-cover", box, className)} />
  ) : (
    <span aria-hidden className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-cta", box, className)}>
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
