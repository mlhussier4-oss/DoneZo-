/**
 * HomeHire Priority (owner decision 2026-11-21): $39.99/month, a 5-minute head start on new jobs.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createCustomer, serviceClient, uniqueEmail } from "./helpers";
import { PAYMENT_TERMS_VERSION } from "../../src/config/legal";

async function makeProvider(plan: "pro" | "priority", zip: string) {
  const db = serviceClient();
  const email = uniqueEmail(`${plan}-pro`), password = `Pw-${randomUUID()}1`;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: "provider", business_name: `${plan} Detailing`, full_name: "Pat", marketplace_enabled: true, plan, payment_terms_version: PAYMENT_TERMS_VERSION } });
  if (error) throw error;
  const { data: m } = await db.from("business_members").select("business_id").eq("user_id", data.user.id).single();
  const businessId = m!.business_id;
  await db.from("business_subscriptions").upsert({ business_id: businessId, status: "active" });
  await db.from("businesses").update({ home_zip: zip, service_radius_miles: 5 }).eq("id", businessId);
  const { data: cat } = await db.from("service_categories").select("id").eq("slug", "car-detailing").single();
  await db.from("provider_categories").upsert({ business_id: businessId, category_id: cat!.id }, { ignoreDuplicates: true });
  return { email, password };
}

async function signIn(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Provider or admin" }).click();
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test("Priority pros see new jobs first, with a head-start countdown; other pros wait", async ({ browser }) => {
  const zip = "78734";
  const fast = await makeProvider("priority", zip);
  const regular = await makeProvider("pro", zip);

  // A customer posts a car detailing job in that ZIP.
  const cust = await createCustomer(uniqueEmail("prio-cust"));
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  await client.auth.signInWithPassword(cust);
  const { data: cat } = await client.from("service_categories").select("id").eq("slug", "car-detailing").single();
  const description = `Full detail ${randomUUID().slice(0, 6)}`;
  const { error } = await client.from("service_requests").insert({ category_id: cat!.id, description, timing: "this_week", zip });
  expect(error).toBeNull();

  const fastPage = await (await browser.newContext()).newPage();
  await signIn(fastPage, fast);
  await fastPage.goto("/provider/marketplace");
  const card = fastPage.getByRole("listitem").filter({ hasText: description });
  await expect(card).toBeVisible();
  await expect(card.getByTestId("head-start")).toContainText("You have a 5-minute head start on your bid!");
  await fastPage.goto((await card.getByRole("link").getAttribute("href"))!);
  await expect(fastPage.getByRole("heading", { name: "Send a bid" })).toBeVisible();
  await expect(fastPage.getByTestId("head-start")).toContainText(/left/);
  await fastPage.goto("/provider/notifications");
  await expect(fastPage.getByText("You have a 5-minute head start on your bid!").first()).toBeVisible();

  const regularPage = await (await browser.newContext()).newPage();
  await signIn(regularPage, regular);
  await regularPage.goto("/provider/marketplace");
  await expect(regularPage.getByText(description)).toHaveCount(0);
});

test("Priority is offered at sign-up and on the plan page, monthly only", async ({ page }) => {
  await page.goto("/signup/provider");
  await expect(page.getByText("HomeHire Priority · $39.99/month, 5-minute head start")).toBeVisible();
  const pro = await makeProvider("pro", "78701");
  await signIn(page, pro);
  await page.goto("/provider/plan");
  const card = page.getByTestId("plan-priority");
  await expect(card).toContainText("$39.99");
  await expect(card).toContainText("Monthly plan");
  await expect(card.getByRole("button", { name: "Upgrade to Priority, $39.99/month" })).toBeVisible();
});
