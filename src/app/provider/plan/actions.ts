"use server";

import { redirect } from "next/navigation";
import { requireManager } from "@/lib/auth";
import { changePlanUrl, type PlanCode } from "@/lib/stripe/subscription";

/** Owner only: open Stripe's confirmation page for switching plans (it shows any amount due now). */
export async function changePlan(plan: PlanCode): Promise<{ error?: string }> {
  const { business } = await requireManager();
  if (business.memberRole !== "owner") return { error: "Only the business owner can change the plan." };
  if (plan !== "basic" && plan !== "pro") return { error: "Choose a plan." };
  if (plan === business.plan.code) return { error: "You're already on this plan." };
  let url: string;
  try {
    url = await changePlanUrl(business.id, plan);
  } catch (err) {
    console.error("change plan failed", err);
    return { error: "We couldn't open Stripe right now. Please try again." };
  }
  redirect(url);
}
