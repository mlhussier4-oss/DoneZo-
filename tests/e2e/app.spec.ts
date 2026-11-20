/**
 * Phone app touches (owner request 2026-11-20). The HomeHire app loads homehire.us and adds
 * "HomeHireApp/ios" or "HomeHireApp/android" to its user agent; these tests act as that app.
 */
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createCustomer, serviceClient, uniqueEmail } from "./helpers";
import { PAYMENT_TERMS_VERSION } from "../../src/config/legal";

const IPHONE_APP = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HomeHireApp/ios";
const ANDROID_APP = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36 HomeHireApp/android";

async function makeProvider(opts: { subscribed: boolean }) {
  const db = serviceClient();
  const email = uniqueEmail("app-pro"), password = `Pw-${randomUUID()}1`;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: "provider", business_name: "App Test Lawn", full_name: "Pat", marketplace_enabled: true, plan: "basic", payment_terms_version: PAYMENT_TERMS_VERSION } });
  if (error) throw error;
  const { data: m } = await db.from("business_members").select("business_id").eq("user_id", data.user.id).single();
  if (opts.subscribed) await db.from("business_subscriptions").upsert({ business_id: m!.business_id, status: "active" });
  return { email, password };
}

async function signIn(page: Page, who: { email: string; password: string }, tab: "Customer" | "Provider or admin") {
  await page.goto("/login");
  await page.getByRole("tab", { name: tab }).click();
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test.describe("inside the iPhone app", () => {
  test.use({ userAgent: IPHONE_APP, viewport: { width: 390, height: 844 } });

  test("customers get a bottom tab bar", async ({ page }) => {
    const who = await createCustomer(uniqueEmail("app-cust"));
    await signIn(page, who, "Customer");
    await page.goto("/customer");
    const tabs = page.getByTestId("app-tab-bar");
    await expect(tabs).toBeVisible();
    await expect(tabs.getByRole("link", { name: "Requests" })).toBeVisible();
    await tabs.getByRole("link", { name: "Messages" }).click();
    await expect(page).toHaveURL(/\/customer\/messages/);
    await tabs.getByRole("button", { name: "More" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  });

  test("providers aren't offered subscription purchases (Apple rule)", async ({ page }) => {
    const pro = await makeProvider({ subscribed: false });
    await signIn(page, pro, "Provider or admin");
    await page.goto("/subscribe");
    await expect(page.getByTestId("ios-plan-note")).toContainText("homehire.us");
    await expect(page.getByRole("button", { name: /Start free month|Subscribe|Yearly/ })).toHaveCount(0);
  });

  test("the plan page shows the plan but sends billing to the website", async ({ page }) => {
    const pro = await makeProvider({ subscribed: true });
    await signIn(page, pro, "Provider or admin");
    await page.goto("/provider/plan");
    await expect(page.getByTestId("ios-plan-note")).toBeVisible();
    await expect(page.getByRole("button", { name: /Upgrade to Pro|Manage billing/ })).toHaveCount(0);
    await expect(page.getByTestId("app-tab-bar").getByRole("link", { name: "Jobs" })).toBeVisible();
  });

  test("provider sign-up leaves out prices", async ({ page }) => {
    await page.goto("/signup/provider");
    await expect(page.getByText("You'll choose your plan on the HomeHire website")).toBeVisible();
    await expect(page.getByText("$9.99/month").first()).toBeHidden();
  });
});

test.describe("inside the Android app", () => {
  test.use({ userAgent: ANDROID_APP, viewport: { width: 412, height: 915 } });

  test("subscriptions work as on the website", async ({ page }) => {
    const pro = await makeProvider({ subscribed: false });
    await signIn(page, pro, "Provider or admin");
    await page.goto("/subscribe");
    await expect(page.getByTestId("ios-plan-note")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Start free month/ }).first()).toBeVisible();
  });
});

test.describe("in a normal browser", () => {
  test("no tab bar, prices shown, and an offline notice when the connection drops", async ({ page, context }) => {
    const who = await createCustomer(uniqueEmail("web-cust"));
    await signIn(page, who, "Customer");
    await page.goto("/customer");
    await expect(page.getByTestId("app-tab-bar")).toBeHidden();
    await context.setOffline(true);
    await expect(page.getByTestId("offline-banner")).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByTestId("offline-banner")).toHaveCount(0);
    await page.goto("/signup/provider");
    await expect(page.getByText("HomeHire Basic · $9.99/month")).toBeVisible();
  });
});
