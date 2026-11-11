#!/usr/bin/env node
/**
 * Create (or promote) a platform administrator.
 *
 *   npm run admin:create -- you@example.com "a-strong-password" "Your Name"
 *
 * Admins cannot be created from the website on purpose. This script uses the
 * SUPABASE_SECRET_KEY, so it only runs where that key is available (your computer
 * or a secure server), never in the browser.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const [email, password, fullName] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: npm run admin:create -- <email> <password> ["Full Name"]');
  process.exit(1);
}
if (password.length < 12) {
  console.error("Use a password of at least 12 characters for admin accounts.");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: created, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { role: "customer", full_name: fullName ?? null },
});

let userId = created?.user?.id;
if (error) {
  if (!/already/i.test(error.message)) {
    console.error(`Could not create user: ${error.message}`);
    process.exit(1);
  }
  const { data: existing } = await supabase.from("profiles").select("id, role").eq("email", email).single();
  if (!existing) {
    console.error("A login with that email exists but has no profile.");
    process.exit(1);
  }
  if (existing.role === "provider") {
    console.error("That email belongs to a provider account. Use a separate email for the admin account.");
    process.exit(1);
  }
  userId = existing.id;
}

const { error: updateError } = await supabase.from("profiles").update({ role: "admin" }).eq("id", userId);
if (updateError) {
  console.error(`Could not set admin role: ${updateError.message}`);
  process.exit(1);
}
await supabase.from("admin_audit_log").insert({
  action: "admin.grant",
  target_type: "user",
  target_id: userId,
  details: { email, via: "scripts/create-admin.mjs" },
});
console.log(`Admin ready: ${email}`);
