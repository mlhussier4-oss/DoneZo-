/**
 * Where sign-ups come from (owner request 2026-11-28): a visitor arrives from a tagged ad link, signs up later,
 * and the admin dashboard credits the sign-up to that ad.
 */
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createAdminUser, signInAsAdmin, signUpCustomer, uniqueEmail } from "./helpers";

test("a homeowner from a Facebook ad is credited to that ad on the admin dashboard", async ({ browser }) => {
  const campaign = `austin_${randomUUID().slice(0, 6)}`;
  const visitor = await (await browser.newContext()).newPage();
  // First visit from the ad, then they browse and sign up later in the same browser.
  await visitor.goto(`/?utm_source=facebook&utm_medium=paid&utm_campaign=${campaign}`);
  await visitor.goto("/faq");
  await signUpCustomer(visitor, uniqueEmail("ad-cust"));

  const adminPage = await (await browser.newContext()).newPage();
  await signInAsAdmin(adminPage, await createAdminUser());
  const card = adminPage.getByTestId("signup-sources");
  await expect(card).toBeVisible();
  await expect(card.getByTestId("signup-channels")).toContainText("Facebook ads");
  await expect(card.getByTestId("signup-campaigns")).toContainText(campaign);
});
