"use server";

import { redirect } from "next/navigation";
import { IOS_PLAN_MESSAGE, isIosApp } from "@/lib/app/server";
import { requireRole, getCurrentBusiness } from "@/lib/auth";
import { isPlanCode, planInfo } from "@/config/plans";
import { billingPortalUrl, startSubscriptionCheckout, type BillingInterval, type PlanCode } from "@/lib/stripe/subscription";

const isPlan = isPlanCode;

export async function subscribe(plan: PlanCode, interval: BillingInterval = "month"): Promise<{ error?: string }> {
  // Apple rule: no subscription purchases inside the iPhone app; plans are managed on the website.
  if (await isIosApp()) return { error: IOS_PLAN_MESSAGE };
  await requireRole("provider");
  const business = await getCurrentBusiness();
  if (!business) return { error: "No business found." };
  if (business.memberRole !== "owner") return { error: "Ask the business owner to set up the subscription." };
  if (!isPlan(plan)) return { error: "Choose a plan." };
  let url: string;
  try {
    url = await startSubscriptionCheckout({ id: business.id, name: business.name, email: business.email }, plan, interval === "year" && planInfo[plan].yearly ? "year" : "month");
  } catch (err) {
    console.error("subscribe failed", err);
    return { error: "We couldn't reach our payment provider. Please try again in a moment." };
  }
  redirect(url);
}

export async function manageBilling(): Promise<{ error?: string }> {
  // Apple rule: no subscription purchases inside the iPhone app; plans are managed on the website.
  if (await isIosApp()) return { error: IOS_PLAN_MESSAGE };
  await requireRole("provider");
  const business = await getCurrentBusiness();
  if (!business || business.memberRole !== "owner") return { error: "Only the owner can manage billing." };
  let url: string;
  try {
    url = await billingPortalUrl(business.id);
  } catch (err) {
    console.error("billing portal failed", err);
    return { error: "We couldn't open billing right now. Please try again." };
  }
  redirect(url);
}
