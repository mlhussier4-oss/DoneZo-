import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

/** Matches a page by its exact path (so "/login?next=/admin" does not count as "/admin"). */
export const atPath = (path: string) => (url: URL) => url.pathname === path;

export const uniqueEmail = (label: string) => `${label}-${randomUUID().slice(0, 8)}@example.com`;

const mailpit = () => process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitMessage = { ID: string; Subject: string };

/** Wait for the newest email to an address in the local test inbox and return its HTML. */
export async function latestEmail(to: string): Promise<{ subject: string; html: string }> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const res = await fetch(`${mailpit()}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const body = (await res.json()) as { messages: MailpitMessage[] };
    if (body.messages?.length) {
      const msg = await (await fetch(`${mailpit()}/api/v1/message/${body.messages[0].ID}`)).json();
      return { subject: msg.Subject, html: msg.HTML as string };
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No email arrived for ${to}`);
}

export function extractCode(html: string): string {
  const match = html.match(/>\s*(\d{6})\s*</);
  if (!match) throw new Error("No 6-digit code in email");
  return match[1];
}

export function extractConfirmLink(html: string): string {
  const match = html.match(/href="([^"]*\/auth\/confirm\?[^"]*)"/);
  if (!match) throw new Error("No confirmation link in email");
  return match[1].replaceAll("&amp;", "&");
}

export async function signUpProvider(
  page: Page,
  opts: { usage: "crm" | "marketplace"; businessName: string; email: string; password?: string; subscribe?: boolean },
) {
  const password = opts.password ?? "Correct-horse-9";
  await page.goto("/signup/provider");
  await page.getByText(opts.usage === "crm" ? "Business Management only" : "Business Management + Marketplace").click();
  await page.getByLabel("Business name").fill(opts.businessName);
  await page.getByLabel("Your name").fill("Test Owner");
  await page.getByLabel("Email").fill(opts.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create provider account" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();

  const email = await latestEmail(opts.email);
  await page.goto(extractConfirmLink(email.html));
  // New providers must subscribe first (owner decision). Unless a test is about that,
  // activate the subscription the way Stripe's webhook would, then continue.
  await expect(page).toHaveURL(atPath("/subscribe"));
  if (opts.subscribe === false) return { password };
  await activateSubscriptionFor(opts.email);
  await page.goto("/provider");
  await expect(page).toHaveURL(atPath("/provider"));
  return { password };
}

export function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function businessIdForEmail(email: string): Promise<string> {
  const db = serviceClient();
  const { data: profile } = await db.from("profiles").select("id").eq("email", email).single();
  const { data: member } = await db.from("business_members").select("business_id").eq("user_id", profile!.id).single();
  return member!.business_id;
}

export async function activateSubscriptionFor(email: string) {
  const businessId = await businessIdForEmail(email);
  await serviceClient().from("business_subscriptions").upsert({ business_id: businessId, status: "active" });
}

export async function signInWithCode(page: Page, email: string, opts: { path?: string; fullName?: string } = {}) {
  await page.goto(opts.path ?? "/login");
  if (opts.fullName) await page.getByLabel("Your name").fill(opts.fullName);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText("We sent a 6-digit code")).toBeVisible();
  const code = extractCode((await latestEmail(email)).html);
  await page.getByLabel("Code").fill(code);
  await page.getByRole("button", { name: "Continue" }).click();
}

export async function signInAsAdmin(page: Page, admin: { email: string; password: string }) {
  await page.goto("/login?next=/admin");
  await page.getByLabel("Email").fill(admin.email);
  await page.getByLabel("Password").fill(admin.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(atPath("/admin"));
}

/** Removes service categories created by tests (slugs starting with "e2e-"). */
export async function deleteTestCategories() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await supabase.from("service_categories").delete().like("slug", "e2e-%");
}

/** Creates an admin directly in the database (as scripts/create-admin.mjs does). */
export async function createAdminUser() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = uniqueEmail("admin");
  const password = `Admin-${randomUUID()}`;
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  await supabase.from("profiles").update({ role: "admin", full_name: "Test Admin" }).eq("id", data.user.id);
  return { email, password };
}
