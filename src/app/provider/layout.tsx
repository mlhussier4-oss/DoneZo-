import { Suspense } from "react";
import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import { employeeNav, providerNav } from "@/config/nav";
import { redirect } from "next/navigation";
import { requireProvider } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { newJobCount, unreadCount } from "@/lib/marketplace/notifications";
import { PendingAlert } from "@/components/marketplace/pending-alert";
import { AcceptPaymentTerms } from "@/components/legal/accept-payment-terms";
import { PAYMENT_TERMS_VERSION } from "@/config/legal";
import { PushToggle } from "@/components/push/push-toggle";

async function ProviderShell({ children }: { children: React.ReactNode }) {
  // Server-side check: only providers reach this area. Data is also protected by RLS.
  const { user, business } = await requireProvider();
  // Paid access (owner decision 2026-11-11). Also enforced in the database for every change.
  const { data: hasAccess } = await (await createClient()).rpc("business_has_access", { p_business_id: business.id });
  if (!hasAccess) redirect("/subscribe");
  const [unread, newJobs, { data: terms }] = await Promise.all([
    unreadCount(user.id),
    newJobCount(user.id),
    (await createClient()).from("businesses").select("payment_terms_version").eq("id", business.id).single(),
  ]);
  // The owner must accept the current Provider terms before continuing (new sign-ups accept at sign-up).
  const mustAcceptTerms = business.memberRole === "owner" && terms?.payment_terms_version !== PAYMENT_TERMS_VERSION;
  return (
    <AppShell
      nav={business.memberRole === "employee" ? employeeNav(unread) : providerNav(business.marketplaceEnabled, unread, business.hasCrm, newJobs)}
      areaLabel="Business"
      homeHref={business.memberRole === "employee" ? "/provider/my-jobs" : business.hasCrm ? "/provider" : "/provider/marketplace"}
      userLabel={business.name}
      userSubLabel={user.email ?? undefined}
    >
      {business.memberRole !== "employee" && business.marketplaceEnabled ? <PendingAlert /> : null}
      {mustAcceptTerms ? null : (
        <PushToggle text={business.memberRole === "employee"
          ? "We'll let you know when you're assigned a job."
          : "We'll let you know when a new job is posted near you, when a customer picks your bid, and when customers message you."} />
      )}
      {mustAcceptTerms ? <AcceptPaymentTerms businessId={business.id} /> : children}
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
