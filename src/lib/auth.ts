import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "customer" | "provider" | "admin";

export type CurrentUser = {
  id: string;
  email: string | null;
  role: AppRole;
  fullName: string | null;
};

export type CurrentBusiness = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  description: string | null;
  marketplaceEnabled: boolean;
  marketplaceEnabledAt: string | null;
  timezone: string;
  defaultTaxRateBps: number;
  memberRole: "owner" | "manager" | "employee";
  /** The plan the business pays for. Business tools (CRM, team, reports) are Pro only; the database enforces it too. */
  plan: { code: "basic" | "pro"; name: string; priceCents: number };
  hasCrm: boolean;
};

/** Where each kind of user lands after signing in. */
export function homePathFor(role: AppRole): string {
  return role === "admin" ? "/admin" : role === "provider" ? "/provider" : "/customer";
}

/**
 * Only allow redirects to paths on this site (prevents "open redirect" attacks
 * where a link sends someone to a look-alike site after signing in).
 */
export function safeNextPath(next: unknown): string | null {
  if (typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

/**
 * The signed-in user, verified with the auth server, plus their profile.
 * Returns null when nobody is signed in. Cached for the duration of one request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, is_suspended")
    .eq("id", userId)
    .single();
  if (!profile) return null;

  if (profile.is_suspended) {
    await supabase.auth.signOut();
    redirect("/login?error=suspended");
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role as AppRole,
    fullName: profile.full_name,
  };
});

/** Require a signed-in user with one of the given roles; otherwise redirect. */
export async function requireRole(...roles: AppRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect(homePathFor(user.role));
  return user;
}

/** The business the signed-in provider belongs to. */
export const getCurrentBusiness = cache(async (): Promise<CurrentBusiness | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_members")
    .select("role, businesses ( id, name, email, phone, description, marketplace_enabled, marketplace_enabled_at, timezone, default_tax_rate_bps, plans ( code, name, price_cents ) )")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const b = data?.businesses;
  if (!data || !b) return null;

  return {
    id: b.id,
    name: b.name,
    email: b.email,
    phone: b.phone,
    description: b.description,
    marketplaceEnabled: b.marketplace_enabled,
    marketplaceEnabledAt: b.marketplace_enabled_at,
    timezone: b.timezone,
    defaultTaxRateBps: b.default_tax_rate_bps,
    memberRole: data.role as CurrentBusiness["memberRole"],
    plan: { code: b.plans?.code === "basic" ? "basic" : "pro", name: b.plans?.name ?? "DoneZo Pro", priceCents: b.plans?.price_cents ?? 1999 },
    hasCrm: b.plans?.code !== "basic",
  };
});

/** Require a provider who belongs to a business. */
export async function requireProvider(): Promise<{ user: CurrentUser; business: CurrentBusiness }> {
  const user = await requireRole("provider");
  const business = await getCurrentBusiness();
  if (!business) {
    // E.g. an employee who was removed from their team. Sign them out with an explanation.
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?error=no_business");
  }
  // Team members are a Pro feature: on Basic only the owner can sign in to the business.
  if (business.memberRole !== "owner" && !business.hasCrm) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?error=team_plan");
  }
  return { user, business };
}

/** Pro business tools (owners and managers). Basic accounts see what Pro adds and how to upgrade. */
export async function requirePro(): Promise<{ user: CurrentUser; business: CurrentBusiness }> {
  const ctx = await requireManager();
  if (!ctx.business.hasCrm) redirect("/provider/plan?need=pro");
  return ctx;
}

/** Owners and managers only. Employees are sent to their own job list. */
export async function requireManager(): Promise<{ user: CurrentUser; business: CurrentBusiness }> {
  const ctx = await requireProvider();
  if (ctx.business.memberRole === "employee") redirect("/provider/my-jobs");
  return ctx;
}
