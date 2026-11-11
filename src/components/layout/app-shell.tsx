"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, Bell, Briefcase, Flag, MapPin, CalendarDays, CreditCard, FileText, Gauge, Home, LayoutGrid, LifeBuoy, LogOut, Gem,
  Menu, MessageSquare, ScrollText, Settings, Store, Tags, UserCog, Users, X, type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const icons = {
  home: Home, gauge: Gauge, calendar: CalendarDays, users: Users, briefcase: Briefcase, invoice: FileText,
  card: CreditCard, store: Store, userCog: UserCog, chart: BarChart3, settings: Settings, message: MessageSquare,
  grid: LayoutGrid, tags: Tags, log: ScrollText, bell: Bell, map: MapPin, flag: Flag, plan: Gem,
} satisfies Record<string, LucideIcon>;

export type NavItem = { href: string; label: string; icon: keyof typeof icons; exact?: boolean; badge?: number };

export function AppShell({
  nav,
  areaLabel,
  homeHref,
  userLabel,
  userSubLabel,
  children,
}: {
  nav: NavItem[];
  areaLabel: string;
  homeHref: string;
  userLabel: string;
  userSubLabel?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const navList = (
    <nav aria-label={`${areaLabel} navigation`} className="flex flex-col gap-1">
      {nav.map((item) => {
        const Icon = icons[item.icon];
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-accent-foreground" aria-label={`${item.badge} unread`}>
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-border pt-4">
      <div className="mb-3 px-3">
        <p className="truncate text-sm font-medium">{userLabel}</p>
        {userSubLabel ? <p className="truncate text-xs text-muted-foreground">{userSubLabel}</p> : null}
      </div>
      <Link href="/help" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
        <LifeBuoy className="size-4" aria-hidden />
        Help &amp; support
      </Link>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" aria-hidden />
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border bg-card p-4 lg:flex">
        <div className="px-2 pt-1">
          <Logo href={homeHref} />
          <p className="mt-1 pl-10 text-xs font-medium uppercase tracking-wide text-muted-foreground">{areaLabel}</p>
        </div>
        <div className="flex-1 overflow-y-auto">{navList}</div>
        {footer}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <Logo href={homeHref} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="flex size-11 cursor-pointer items-center justify-center rounded-lg hover:bg-muted"
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col gap-6 bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{areaLabel}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex size-11 cursor-pointer items-center justify-center rounded-lg hover:bg-muted"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{navList}</div>
            {footer}
          </div>
        </div>
      ) : null}

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden h-dvh border-r border-border bg-card lg:block" />
      <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-32 rounded-lg bg-muted" />
        </div>
      </main>
    </div>
  );
}
