#!/usr/bin/env node
/**
 * App Store / Google Play reviewer accounts (owner request 2026-11-20).
 *
 *   npm run review:accounts
 *
 * Creates (or resets) two clearly labeled test logins for Apple's and Google's app reviewers:
 *   appreview.customer@homehire.us  – a homeowner with one booked job (with chat) and one job with a bid waiting
 *   appreview.pro@homehire.us       – a HomeHire Pro business that can see and bid on those jobs
 * Both are marked is_review_account, so they live in their own "review world": real providers never see the
 * review jobs, real customers never see the review business, and the admin dashboard leaves them out.
 * The pro account gets complimentary access (no Stripe subscription, nothing charged).
 *
 * New passwords are printed once. Put them in App Store Connect / Play Console ("App Review Information");
 * never commit them. Running it again resets the passwords and posts fresh sample jobs if the old ones have expired,
 * so run it shortly before each app submission.
 * Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY (from .env.local or the environment).
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !anonKey || !secretKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_SECRET_KEY.");
  process.exit(1);
}
// The reviewer pro starts with the current Provider terms accepted, so the review goes straight to the app.
const termsVersion = readFileSync(new URL("../src/config/legal.ts", import.meta.url), "utf8").match(/PAYMENT_TERMS_VERSION\s*=\s*"([^"]+)"/)?.[1];
if (!termsVersion) { console.error("Couldn't read PAYMENT_TERMS_VERSION from src/config/legal.ts."); process.exit(1); }
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secretKey, noSession);

const CUSTOMER = { email: "appreview.customer@homehire.us", meta: { role: "customer", full_name: "Jordan" } };
const PRO = {
  email: "appreview.pro@homehire.us",
  meta: { role: "provider", business_name: "Review Test Pro (App Review)", marketplace_enabled: true, plan: "pro", full_name: "Review Test Pro" },
};

const newPassword = () => `HH-${randomBytes(9).toString("base64url")}`;
const must = (res, what) => {
  if (res.error) { console.error(`${what}: ${res.error.message}`); process.exit(1); }
  return res.data;
};

/** Create the login, or reset its password if it already exists. Returns { id, password }. */
async function ensureUser({ email, meta }) {
  const password = newPassword();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
  if (!created.error) return { id: created.data.user.id, password };
  if (!/already/i.test(created.error.message)) { console.error(`Could not create ${email}: ${created.error.message}`); process.exit(1); }
  const { id } = must(await admin.from("profiles").select("id").eq("email", email).single(), `Find ${email}`);
  must(await admin.auth.admin.updateUserById(id, { password }), `Reset password for ${email}`);
  return { id, password };
}

async function signIn(email, password) {
  const client = createClient(url, anonKey, noSession);
  must(await client.auth.signInWithPassword({ email, password }), `Sign in as ${email}`);
  return client;
}

const customer = await ensureUser(CUSTOMER);
const pro = await ensureUser(PRO);

// Flag both before any sample job is posted, so "new job" alerts and the job board stay in the review world.
must(await admin.from("profiles").update({ is_review_account: true }).in("id", [customer.id, pro.id]), "Flag review profiles");
const { business_id: businessId } = must(await admin.from("business_members").select("business_id").eq("user_id", pro.id).single(), "Find review business");
must(await admin.from("businesses").update({
  is_review_account: true,
  home_zip: "78704",
  service_radius_miles: 25,
  payment_terms_version: termsVersion,
  description: "Test account for app reviewers. This business is not shown to real HomeHire customers.",
}).eq("id", businessId), "Set up review business");
// Complimentary access: no Stripe subscription and nothing is charged.
must(await admin.from("business_subscriptions").upsert({ business_id: businessId, status: "active" }), "Give review business access");

const { data: cats } = await admin.from("service_categories").select("id, slug").eq("is_active", true);
const cat = Object.fromEntries((cats ?? []).map((c) => [c.slug, c.id]));
must(await admin.from("provider_categories").upsert(
  ["lawn-mowing", "house-cleaning", "pressure-washing"].filter((s) => cat[s]).map((s) => ({ business_id: businessId, category_id: cat[s] })),
  { onConflict: "business_id,category_id", ignoreDuplicates: true },
), "Choose review business services");

const c = await signIn(CUSTOMER.email, customer.password);
const p = await signIn(PRO.email, pro.password);
const post = async (slug, description, timing) =>
  must(await c.from("service_requests").insert({ category_id: cat[slug], description, timing, zip: "78745" }).select("id").single(), `Post ${slug} job`);
const bid = async (requestId, priceCents, included, availability) =>
  must(await p.from("bids").insert({ request_id: requestId, business_id: businessId, price_cents: priceCents, included, availability }).select("id").single(), "Send bid");

// 1) A booked job with a chat (created once).
const { count: bookings } = await admin.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", businessId);
if (!bookings) {
  const lawn = await post("lawn-mowing", "Front and back yard, about a quarter acre. Please bag the clippings.", "this_week");
  const lawnBid = await bid(lawn.id, 6500, "Mow, edge, trim and bag clippings", "In the next couple of days");
  const pending = must(await c.rpc("accept_bid", { p_bid_id: lawnBid.id }), "Pick bid");
  const arrival = new Date(Date.now() + 2 * 86_400_000); arrival.setUTCHours(15, 0, 0, 0);
  const booking = must(await p.rpc("confirm_booking", { p_booking_id: pending.id, p_arrival_at: arrival.toISOString() }), "Confirm job");
  must(await c.from("messages").insert({ booking_id: booking.id, body: "Hi! This is a sample chat for app review. The side gate is unlocked." }), "Customer message");
  must(await p.from("messages").insert({ booking_id: booking.id, body: "Thanks! See you then. I'll message you when I'm on the way." }), "Pro message");
  console.log("Created a booked sample job with a chat.");
}

// 2) Open jobs expire like real ones, so fresh ones are posted whenever none are open (run this right before
//    submitting the app): one with a bid waiting for the customer to pick, one the pro can bid on.
const { count: open } = await admin.from("service_requests").select("id", { count: "exact", head: true })
  .eq("customer_id", customer.id).eq("status", "open").gt("expires_at", new Date().toISOString());
if (!open) {
  const cleaning = await post("house-cleaning", "Standard cleaning for a 3-bedroom, 2-bath house.", "within_3_days");
  await bid(cleaning.id, 14000, "Kitchen, bathrooms, dusting, vacuum and mop", "Next Monday or Tuesday");
  await post("pressure-washing", "Driveway and front walkway, about 600 square feet.", "this_week");
  console.log("Posted fresh sample jobs: one with a bid to pick, one open for bidding.");
} else {
  console.log("Open sample jobs are still live; left as they are.");
}

console.log("\nApp reviewer logins (put these in App Store Connect / Play Console; don't commit them):");
console.log(`  Homeowner: ${CUSTOMER.email}  password: ${customer.password}`);
console.log(`  Pro:       ${PRO.email}  password: ${pro.password}`);
