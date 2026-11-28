import Image from "next/image";
import { Apple, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Get the HomeHire app" links (owner request 2026-11-28). Hidden until the store links exist: set
 * NEXT_PUBLIC_APP_STORE_URL and/or NEXT_PUBLIC_PLAY_STORE_URL in Vercel when the apps are approved, then redeploy.
 * Never shown inside the app itself. Sign-up and subscriptions stay on the website (no app-store cut).
 */
// Read with their full names so they're built into the site (NEXT_PUBLIC_ values are fixed at build time).
const BUILT_IN = { NEXT_PUBLIC_APP_STORE_URL: process.env.NEXT_PUBLIC_APP_STORE_URL, NEXT_PUBLIC_PLAY_STORE_URL: process.env.NEXT_PUBLIC_PLAY_STORE_URL };

export function appStoreLinks(env: Record<string, string | undefined> = BUILT_IN) {
  const ok = (v?: string) => (v && /^https:\/\//.test(v) ? v : null);
  return { ios: ok(env.NEXT_PUBLIC_APP_STORE_URL), android: ok(env.NEXT_PUBLIC_PLAY_STORE_URL) };
}

export function GetTheApp({ variant = "card", className }: { variant?: "card" | "footer"; className?: string }) {
  const { ios, android } = appStoreLinks();
  if (!ios && !android) return null;
  const dark = variant === "footer";
  const button = cn(
    "inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors",
    dark ? "bg-white text-primary hover:bg-white/90" : "bg-primary text-white hover:bg-primary-hover",
  );
  return (
    <div data-testid="get-the-app" className={cn(
      "app:hidden flex flex-wrap items-center gap-4",
      variant === "card" && "rounded-xl border border-border bg-card p-4 shadow-sm",
      className,
    )}>
      <div className="flex items-center gap-3">
        <Image src="/icons/icon-192.png" alt="" width={48} height={48} className="rounded-xl" />
        <div>
          <p className={cn("font-semibold", dark ? "text-white" : "text-foreground")}>Get the HomeHire app</p>
          <p className={cn("text-xs", dark ? "text-white/60" : "text-muted-foreground")}>Same account. Bids, chat and alerts on your phone.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {ios ? <a href={ios} target="_blank" rel="noopener noreferrer" className={button}><Apple className="size-4" aria-hidden />iPhone app · App Store</a> : null}
        {android ? <a href={android} target="_blank" rel="noopener noreferrer" className={button}><Smartphone className="size-4" aria-hidden />Android app · Google Play</a> : null}
      </div>
    </div>
  );
}
