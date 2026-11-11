import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/env";
import { getCurrentBusiness, getCurrentUser } from "@/lib/auth";
import { onboardingLink } from "@/lib/stripe/connect";

/** Stripe sends providers here when an onboarding link has expired: make a fresh one. */
export async function GET() {
  const user = await getCurrentUser();
  const business = user?.role === "provider" ? await getCurrentBusiness() : null;
  if (!business) return NextResponse.redirect(siteUrl("/login"));
  try {
    return NextResponse.redirect(await onboardingLink({ id: business.id, name: business.name, email: business.email }));
  } catch {
    return NextResponse.redirect(siteUrl("/provider/payments?stripe=error"));
  }
}
