import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { homePathFor, safeNextPath, type AppRole } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const allowedTypes: EmailOtpType[] = ["email", "signup", "magiclink", "recovery", "email_change"];

/** Handles the links in confirmation, sign-in and password-reset emails. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  const fail = () => NextResponse.redirect(siteUrl("/login?error=link"));
  if (!tokenHash || !type || !allowedTypes.includes(type)) return fail();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error || !data.user) return fail();

  let destination = next;
  if (type !== "recovery") {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    const home = homePathFor((profile?.role as AppRole) ?? "customer");
    destination = next && next.startsWith(home) ? next : home;
  }
  return NextResponse.redirect(siteUrl(destination ?? "/dashboard"));
}
