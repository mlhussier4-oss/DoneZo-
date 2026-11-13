import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/** The mark: a house with a check mark inside (job done at home), navy on yellow. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M5.5 9.5V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />
      <path d="M8.75 14.25 11 16.5l4.25-4.5" />
    </svg>
  );
}

/** Logo: the mark in a yellow rounded square plus the brand name. */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-cta text-cta-foreground" aria-hidden>
        <LogoMark className="size-5" />
      </span>
      <span className="text-lg">{brand.name}</span>
    </Link>
  );
}
