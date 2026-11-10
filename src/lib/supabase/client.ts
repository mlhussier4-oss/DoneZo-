"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/** Browser-side Supabase client (acts as the signed-in user; RLS applies). Used for direct photo uploads. */
export function createBrowserSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
