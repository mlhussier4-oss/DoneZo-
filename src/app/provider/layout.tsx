import { Suspense } from "react";
import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import { providerNav } from "@/config/nav";
import { requireProvider } from "@/lib/auth";
import { unreadCount } from "@/lib/marketplace/notifications";

async function ProviderShell({ children }: { children: React.ReactNode }) {
  // Server-side check: only providers reach this area. Data is also protected by RLS.
  const { user, business } = await requireProvider();
  const unread = await unreadCount(user.id);
  return (
    <AppShell
      nav={providerNav(business.marketplaceEnabled, unread)}
      areaLabel="Business"
      homeHref="/provider"
      userLabel={business.name}
      userSubLabel={user.email ?? undefined}
    >
      {children}
    </AppShell>
  );
}

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <ProviderShell>{children}</ProviderShell>
    </Suspense>
  );
}
