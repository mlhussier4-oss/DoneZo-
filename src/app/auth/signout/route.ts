import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// POST only, so a link or image on another site can't sign people out.
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(siteUrl("/"), { status: 303 });
}
