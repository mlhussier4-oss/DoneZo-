"use server";

import { redirect } from "next/navigation";
import { requireRole, getCurrentBusiness } from "@/lib/auth";
import { billingPortalUrl, startSubscriptionCheckout } from "@/lib/stripe/subscription";

export async function subscribe(): Promise<{ error?: string }> {
  await requireRole("provider");
  const business = await getCurrentBusiness();
  if (!business) return { error: "No business found." };
  if (business.memberRole === "employee") return { error: "Ask the business owner to set up the subscription." };
  let url: string;
  try {
    url = await startSubscriptionCheckout({ id: business.id, name: business.name, email: business.email });
  } catch (err) {
    console.error("subscribe failed", err);
    return { error: "We couldn't reach our payment provider. Please try again in a moment." };
  }
  redirect(url);
}

export async function manageBilling(): Promise<{ error?: string }> {
  await requireRole("provider");
  const business = await getCurrentBusiness();
  if (!business || business.memberRole === "employee") return { error: "Only the owner can manage billing." };
  let url: string;
  try {
    url = await billingPortalUrl(business.id);
  } catch (err) {
    console.error("billing portal failed", err);
    return { error: "We couldn't open billing right now. Please try again." };
  }
  redirect(url);
}
