/**
 * Provider website link (owner request 2026-11-28): optional, shown on the public profile.
 */
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { serviceClient, uniqueEmail } from "./helpers";
import { PAYMENT_TERMS_VERSION } from "../../src/config/legal";

test("a pro adds a website and customers see it on their profile", async ({ page }) => {
  const db = serviceClient();
  const email = uniqueEmail("site-pro"), password = `Pw-${randomUUID()}1`;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: "provider", business_name: "Site Test Lawn", full_name: "Pat", marketplace_enabled: true, plan: "pro", payment_terms_version: PAYMENT_TERMS_VERSION } });
  if (error) throw error;
  const { data: m } = await db.from("business_members").select("business_id").eq("user_id", data.user.id).single();
  const businessId = m!.business_id;
  await db.from("business_subscriptions").upsert({ business_id: businessId, status: "active" });
  await db.from("businesses").update({ home_zip: "78704", service_radius_miles: 10 }).eq("id", businessId);
  const { data: cat } = await db.from("service_categories").select("id").eq("slug", "lawn-mowing").single();
  await db.from("provider_categories").upsert({ business_id: businessId, category_id: cat!.id }, { ignoreDuplicates: true });

  await page.goto("/login");
  await page.getByRole("tab", { name: "Provider or admin" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));

  await page.goto("/provider/marketplace/profile");
  await expect(page.getByText("List a website link for customers to see.")).toBeVisible();
  const website = page.getByLabel("Website (optional)");

  // A non-link is refused with a clear message.
  await website.fill("call me maybe");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Enter a website link, like https://yourbusiness.com")).toBeVisible();

  // "sitetestlawn.com" is saved as https://sitetestlawn.com and shown on the public profile.
  await website.fill("sitetestlawn.com");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText(/saved/i).first()).toBeVisible();
  await page.goto(`/pros/${businessId}`);
  const link = page.getByTestId("pro-website");
  await expect(link).toHaveText("sitetestlawn.com");
  await expect(link).toHaveAttribute("href", "https://sitetestlawn.com");
  await expect(link).toHaveAttribute("rel", /nofollow/);
});
