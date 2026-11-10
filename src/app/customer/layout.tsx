import { Suspense } from "react";
import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import { customerNav } from "@/config/nav";
import { requireRole } from "@/lib/auth";

async function CustomerShell({ children }: { children: React.ReactNode }) {
  const user = await requireRole("customer");
  return (
    <AppShell nav={customerNav} areaLabel="My account" homeHref="/customer" userLabel={user.fullName ?? user.email ?? "Customer"} userSubLabel={user.fullName ? (user.email ?? undefined) : undefined}>
      {children}
    </AppShell>
  );
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <CustomerShell>{children}</CustomerShell>
    </Suspense>
  );
}
