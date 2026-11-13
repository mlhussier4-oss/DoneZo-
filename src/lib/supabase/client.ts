"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { REMEMBER_COOKIE, sessionOnly } from "./remember";

function readCookies() {
  if (typeof document === "undefined" || !document.cookie) return [];
  return document.cookie.split("; ").map((c) => {
    const i = c.indexOf("=");
    return { name: decodeURIComponent(c.slice(0, i)), value: decodeURIComponent(c.slice(i + 1)) };
  });
}

/** Browser-side Supabase client (acts as the signed-in user; RLS applies). Respects "Keep me signed in". */
export function createBrowserSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => readCookies(),
        setAll(cookiesToSet) {
          const remember = readCookies().find((c) => c.name === REMEMBER_COOKIE)?.value;
          for (const { name, value, options } of cookiesToSet) {
            const o = sessionOnly(options, remember) ?? {};
            let str = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=${o.path ?? "/"}`;
            if (o.maxAge !== undefined) str += `; Max-Age=${o.maxAge}`;
            if (o.expires) str += `; Expires=${new Date(o.expires).toUTCString()}`;
            if (o.domain) str += `; Domain=${o.domain}`;
            str += `; SameSite=${typeof o.sameSite === "string" ? o.sameSite : "Lax"}`;
            if (o.secure || location.protocol === "https:") str += "; Secure";
            document.cookie = str;
          }
        },
      },
    },
  );
}
