"use server";

import { refresh } from "next/cache";
import { PAYMENT_TERMS_VERSION } from "@/config/legal";
import { requireProvider } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Owner accepts the current Provider terms. The database checks the caller is the owner. */
export async function acceptPaymentTerms(fd: FormData): Promise<void> {
  const { business } = await requireProvider();
  if (fd.get("agree") !== "on" || fd.get("businessId") !== business.id) return;
  const { error } = await (await createClient()).rpc("accept_payment_terms", { p_business_id: business.id, p_version: PAYMENT_TERMS_VERSION });
  if (error) throw new Error("Could not save your acceptance. Please try again.");
  refresh();
}
