import { Suspense } from "react";
import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import { employeeNav, providerNav } from "@/config/nav";
import { redirect } from "next/navigation";
import { requireProvider } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { unreadCount } from "@/lib/marketplace/notifications";

async function ProviderShell({ children }: { children: React.ReactNode }) {
  // Server-side check: only providers reach this area. Data is also protected by RLS.
  const { user, business } = await requireProvider();
  // Paid access (owner decision 2026-11-11). Also enforced in the database for every change.
  const { data: hasAccess } = await (await createClient()).rpc("business_has_access", { p_business_id: business.id });
  if (!hasAccess) redirect("/subscribe");
  const unread = await unreadCount(user.id);
  return (
    <AppShell
      nav={business.memberRole === "employee" ? employeeNav(unread) : providerNav(business.marketplaceEnabled, unread, business.hasCrm)}
      areaLabel="Business"
      homeHref={business.memberRole === "employee" ? "/provider/my-jobs" : business.hasCrm ? "/provider" : "/provider/marketplace"}
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
