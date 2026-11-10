import { expect, test, type Browser, type Page } from "@playwright/test";
import { atPath, extractCode, latestEmail, signUpProvider, uniqueEmail } from "./helpers";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function marketplaceProvider(browser: Browser, name: string, zip = "78704") {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signUpProvider(page, { usage: "marketplace", businessName: name, email: uniqueEmail("pro") });
  await page.goto("/provider/marketplace/profile");
  await page.getByLabel("Home ZIP code").fill(zip);
  await page.getByLabel("Service radius (miles)").fill("20");
  await page.getByLabel("Lawn mowing").check();
  await page.getByLabel("Cash", { exact: true }).check();
  await page.getByLabel("Venmo").check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved")).toBeVisible();
  return page;
}

/** A first-time visitor posts a job through the wizard and confirms with an email code. */
async function postJobAsNewCustomer(page: Page, email: string, description: string) {
  await page.goto("/post-job?category=lawn-mowing");
  await page.waitForLoadState("networkidle"); // the wizard must be interactive before a file is attached
  await page.getByTestId("request-photos").setInputFiles({ name: "yard.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("img", { name: "Photo 1" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("What needs to be done?").fill(description);
  await page.getByRole("button", { name: "Medium" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "Later this week" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Street address").fill("1100 Bluebonnet Ln");
  await page.getByLabel("ZIP code").fill("78745");
  await page.getByLabel("Mobile phone (optional)").fill("512-555-0199");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Review and post" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Your first name (optional)").fill("Riley");
  await page.getByRole("button", { name: "Email me a code" }).click();
  const code = extractCode((await latestEmail(email)).html);
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Confirm and post job" }).click();
  await expect(page.getByText("Your job is posted")).toBeVisible({ timeout: 15_000 });
  return new URL(page.url()).pathname;
}

test.describe("marketplace: post → bid → accept → message → change → complete → review", () => {
  test("the whole customer-to-provider booking works with every privacy rule intact", async ({ page, browser }) => {
    test.setTimeout(180_000);
    const alpha = await marketplaceProvider(browser, "Alpha Lawn Co");
    const bravo = await marketplaceProvider(browser, "Bravo Yard Pros");

    // 1. A new customer posts a job (no card, no password).
    const customerEmail = uniqueEmail("riley");
    const description = `Front and back yard, quarter acre, ref ${Date.now()}`;
    const requestPath = await postJobAsNewCustomer(page, customerEmail, description);
    await expect(page.getByText("Waiting for bids")).toBeVisible();

    // 2. Both providers see it on their job board, with the photo but without the address or name.
    for (const pro of [alpha, bravo]) {
      await pro.goto("/provider/marketplace");
      await pro.getByRole("link", { name: new RegExp(description) }).click();
      await expect(pro.getByText(description)).toBeVisible();
      await expect(pro.getByRole("img", { name: "Customer photo 1" })).toBeVisible();
      await expect(pro.getByText("ZIP 78745")).toBeVisible();
      await expect(pro.getByText("Bluebonnet")).toHaveCount(0);
      await expect(pro.getByText("Riley")).toHaveCount(0);
      await expect(pro.getByText("512-555-0199")).toHaveCount(0);
    }

    // 3. Sealed bids.
    await alpha.getByLabel("Your price ($)").fill("65");
    await alpha.getByLabel("What's included").fill("Mow, edge and blow front and back");
    await alpha.getByLabel("When you can do it").fill("Thursday morning");
    await alpha.getByRole("button", { name: "Send bid" }).click();
    await expect(alpha.getByText("Bid sent")).toBeVisible();

    await bravo.getByLabel("Your price ($)").fill("70");
    await bravo.getByLabel("What's included").fill("Mow and edge");
    await bravo.getByLabel("When you can do it").fill("Friday");
    await bravo.getByRole("button", { name: "Send bid" }).click();
    await expect(bravo.getByText("Bid sent")).toBeVisible();
    await bravo.reload();
    await expect(bravo.getByText("$65.00")).toHaveCount(0); // never sees Alpha's price

    // 4. The customer compares and accepts.
    await page.goto(requestPath);
    await expect(page.getByRole("heading", { name: "Bids (2)" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Alpha Lawn Co/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Bravo Yard Pros/ })).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Choose Alpha Lawn Co" }).click();
    await expect(page.getByText("Agreed price")).toBeVisible();
    await expect(page.getByText("$65.00").first()).toBeVisible();

    // 5. The winner now sees the customer's details; the other provider is told they weren't chosen.
    await alpha.goto("/provider/marketplace?tab=bookings");
    await alpha.getByRole("link", { name: /Riley/ }).click();
    await expect(alpha.getByText("1100 Bluebonnet Ln")).toBeVisible();
    await expect(alpha.getByText("512-555-0199")).toBeVisible();
    await bravo.goto("/provider/marketplace?tab=bids");
    await expect(bravo.getByText("Not chosen")).toBeVisible();

    // 6. Private messaging, both ways.
    await alpha.getByLabel("Message", { exact: true }).fill("Hi Riley, Thursday at 9am works?");
    await alpha.getByRole("button", { name: "Send", exact: true }).click();
    await expect(alpha.getByText("Hi Riley, Thursday at 9am works?")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Hi Riley, Thursday at 9am works?")).toBeVisible();
    await page.getByLabel("Message", { exact: true }).fill("Perfect, gate code is 4512");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("Perfect, gate code is 4512")).toBeVisible();
    await alpha.reload();
    await expect(alpha.getByText("Perfect, gate code is 4512")).toBeVisible();

    // 7. A price change needs the customer's approval.
    await alpha.getByLabel("New total price ($)").fill("80");
    await alpha.getByLabel("What changed?").fill("Back yard also needs weed-eating along the fence");
    await alpha.getByRole("button", { name: "Send to customer for approval" }).click();
    await expect(alpha.getByText("Waiting for the customer: $80.00")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Your provider proposed a change")).toBeVisible();
    await page.getByRole("button", { name: "Approve new price" }).click();
    await expect(page.getByText("Originally $65.00")).toBeVisible();
    await expect(page.getByText("$80.00").first()).toBeVisible();

    // 8. The provider does the job in the CRM.
    await alpha.reload();
    await alpha.getByRole("link", { name: /Open job/ }).click();
    await expect(alpha.getByText("Marketplace").first()).toBeVisible();
    await alpha.getByRole("button", { name: "Start job" }).click();
    await expect(alpha.getByText("In progress").first()).toBeVisible();
    await alpha.getByRole("button", { name: "Mark complete" }).click();
    await expect(alpha.getByText("Completed").first()).toBeVisible();

    // 9. The customer reviews; the public profile reflects it.
    await page.reload();
    await expect(page.getByText("Job completed")).toBeVisible();
    await page.getByRole("radio", { name: "5 stars" }).click();
    await page.getByLabel("Comments (optional)").fill("On time and did a great job.");
    await page.getByRole("button", { name: "Post review" }).click();
    await expect(page.getByRole("heading", { name: "Your review" })).toBeVisible();
    await page.getByRole("link", { name: "Alpha Lawn Co" }).first().click();
    // Previous pages stay mounted (hidden) for instant back-navigation, so look at visible text only.
    await expect(page.getByText("5.0").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("On time and did a great job.").filter({ visible: true })).toBeVisible();
    await expect(page.getByText(/1 job completed on DoneZo/).filter({ visible: true })).toBeVisible();
  });

  test("ZIP codes outside the Austin area are turned away", async ({ page }) => {
    await page.goto("/post-job?category=lawn-mowing");
    await page.getByRole("button", { name: "Skip for now" }).click();
    await page.getByLabel("What needs to be done?").fill("Mow the lawn");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("radio", { name: "As soon as possible" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Street address").fill("1 Main St");
    await page.getByLabel("City").fill("Dallas");
    await page.getByLabel("ZIP code").fill("75201");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("We're starting in the Austin, TX area")).toBeVisible();
  });

  test("a CRM-only provider never sees the marketplace", async ({ page }) => {
    await signUpProvider(page, { usage: "crm", businessName: "Quiet CRM Co", email: uniqueEmail("quiet") });
    const nav = page.getByRole("navigation", { name: "Business navigation" }).first();
    await expect(nav.getByRole("link", { name: "Marketplace" })).toHaveCount(0);
    for (const path of ["/provider/marketplace", "/provider/marketplace/profile"]) {
      await page.goto(path);
      await expect(page).toHaveURL(atPath("/provider/settings"));
    }
  });
});

test.describe("posting a job on a phone @mobile", () => {
  test("the wizard fits the screen and starts with large service buttons @mobile", async ({ page }) => {
    await page.goto("/post-job");
    await expect(page.getByRole("heading", { name: "What do you need done?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Lawn mowing" })).toBeVisible();
    const box = await page.getByRole("button", { name: "Lawn mowing" }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
