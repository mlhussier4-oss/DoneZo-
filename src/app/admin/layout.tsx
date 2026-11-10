import { Suspense } from "react";
import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import { adminNav } from "@/config/nav";
import { requireRole } from "@/lib/auth";

async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin");
  return (
    <AppShell nav={adminNav} areaLabel="Admin" homeHref="/admin" userLabel={user.fullName ?? "Administrator"} userSubLabel={user.email ?? undefined}>
      {children}
    </AppShell>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
