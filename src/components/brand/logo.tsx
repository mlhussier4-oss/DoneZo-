import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Placeholder logo: a check mark in a rounded square plus the brand name. Replace when a real logo exists. */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <span className="text-lg">{brand.name}</span>
    </Link>
  );
}
