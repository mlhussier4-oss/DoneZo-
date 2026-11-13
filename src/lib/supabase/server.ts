import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";
import { REMEMBER_COOKIE, sessionOnly } from "./remember";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * It acts as the logged-in user, so database Row Level Security applies.
 */
export async function createClient() {
  // Login checks depend on the current time and the request, so never pre-render them.
  await connection();
  const cookieStore = await cookies();
  return createServerClient<Database>(publicEnv.supabaseUrl(), publicEnv.supabaseKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          const remember = cookieStore.get(REMEMBER_COOKIE)?.value;
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, sessionOnly(options, remember)));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session cookie instead.
        }
      },
    },
  });
}
