/**
 * Admin revenue box (owner request 2026-11-22): subscription payments show up on the dashboard,
 * with Today / 7 days / 30 days / Year filters.
 */
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createAdminUser, serviceClient, signInAsAdmin, uniqueEmail } from "./helpers";
import { PAYMENT_TERMS_VERSION } from "../../src/config/legal";

test("a new subscription payment appears in the admin revenue box", async ({ page }) => {
  const db = serviceClient();
  const name = `Revenue Lawn ${randomUUID().slice(0, 6)}`;
  const { data, error } = await db.auth.admin.createUser({
    email: uniqueEmail("rev-pro"), password: `Pw-${randomUUID()}1`, email_confirm: true,
    user_metadata: { role: "provider", business_name: name, full_name: "Pat", marketplace_enabled: true, plan: "pro", payment_terms_version: PAYMENT_TERMS_VERSION },
  });
  if (error) throw error;
  const { data: m } = await db.from("business_members").select("business_id").eq("user_id", data.user.id).single();

  const admin = await createAdminUser();
  await signInAsAdmin(page, admin);
  const card = page.getByTestId("revenue-card");
  await expect(card).toBeVisible();
  await expect(card.getByRole("link", { name: "30 days" })).toHaveAttribute("aria-current", "page");

  // Stripe confirms a $19.99 subscription payment (as the webhook does).
  expect((await db.rpc("record_subscription_payment", { p_invoice_id: `in_e2e_${randomUUID().slice(0, 10)}`, p_business_id: m!.business_id, p_amount_cents: 1999, p_paid_at: new Date().toISOString() })).error).toBeNull();

  await card.getByRole("link", { name: "Today" }).click();
  await expect(page).toHaveURL(/rev=today/);
  await expect(page.getByTestId("revenue-recent")).toContainText(name);
  await expect(page.getByTestId("revenue-recent")).toContainText("$19.99");
  for (const label of ["7 days", "Year"]) {
    await page.getByTestId("revenue-card").getByRole("link", { name: label }).click();
    await expect(page.getByTestId("revenue-card").getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
  }
});
