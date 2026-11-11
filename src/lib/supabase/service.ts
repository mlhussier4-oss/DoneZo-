import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role client: bypasses Row Level Security. SERVER ONLY.
 * Used only after the server has checked who is asking (or verified a Stripe signature),
 * for writes that browsers are never allowed to make (payment status, Stripe account status).
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set. See .env.example.");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
