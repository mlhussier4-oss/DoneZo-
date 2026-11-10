import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

/**
 * A client with no login, for public data only (e.g. service categories).
 * Safe to use inside cached functions because it never reads cookies.
 */
export function createPublicClient() {
  return createClient(publicEnv.supabaseUrl(), publicEnv.supabaseKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
