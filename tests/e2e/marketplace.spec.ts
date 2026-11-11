import { expect, test, type Browser, type Page } from "@playwright/test";
import { atPath, serviceClient, signUpProvider, uniqueEmail } from "./helpers";

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

/** A first-time visitor posts a job through the wizard: no email, password or card (owner decision 2026-11-12). */
async function postJobAsNewCustomer(page: Page, description: string) {
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
  await expect(page.getByLabel("Email")).toHaveCount(0);
  await page.getByRole("button", { name: "Post job" }).click();
  await expect(page.getByText("Your job is posted.")).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/customer\?posted=/);
  return new URL(page.url()).searchParams.get("posted")!;
}

async function sendBid(pro: Page, description: string, price: string, included: string, when: string) {
  await pro.goto("/provider/marketplace");
  await pro.getByRole("link", { name: new RegExp(description) }).click();
  await pro.getByLabel("Your price ($)").fill(price);
  await pro.getByLabel("What's included").fill(included);
  await pro.getByLabel("When you can do it").fill(when);
  await pro.getByRole("button", { name: "Send bid" }).click();
  await expect(pro.getByText("Bid sent")).toBeVisible();
}

test.describe("marketplace: post → bid → accept → message → change → complete → review", () => {
  test("the whole customer-to-provider booking works with every privacy rule intact", async ({ page, browser }) => {
    test.setTimeout(180_000);
    const alpha = await marketplaceProvider(browser, "Alpha Lawn Co");
    const bravo = await marketplaceProvider(browser, "Bravo Yard Pros");

    // 1. A new customer posts a job: no email, password or card. They land on their dashboard.
    const description = `Front and back yard, quarter acre, ref ${Date.now()}`;
    const requestId = await postJobAsNewCustomer(page, description);
    const requestPath = `/customer/requests/${requestId}`;
    await expect(page.getByText("Waiting for bids.")).toBeVisible();

    // A red "new jobs" badge appears on Marketplace by itself (no reload) while the provider is on another page.
    await expect(alpha.getByTestId("new-jobs-badge")).toHaveText("1", { timeout: 20_000 });

    // 2. Both providers see it on their job board, with the photo but without the address or phone.
    for (const pro of [alpha, bravo]) {
      await pro.goto("/provider/marketplace");
      await pro.getByRole("link", { name: new RegExp(description) }).click();
      await expect(pro.getByText(description)).toBeVisible();
      await expect(pro.getByRole("img", { name: "Customer photo 1" })).toBeVisible();
      await expect(pro.getByText("ZIP 78745")).toBeVisible();
      await expect(pro.getByText("Bluebonnet")).toHaveCount(0);
      await expect(pro.getByText("512-555-0199")).toHaveCount(0);
    }
    // Having opened the job board, the badge is cleared.
    await alpha.goto("/provider/marketplace");
    await expect(alpha.getByTestId("new-jobs-badge")).toHaveCount(0, { timeout: 15_000 });

    // 3. Sealed bids.
    await sendBid(alpha, description, "65", "Mow, edge and blow front and back", "Thursday morning");
    await sendBid(bravo, description, "70", "Mow and edge", "Friday");
    await bravo.reload();
    await expect(bravo.getByText("$65.00")).toHaveCount(0); // never sees Alpha's price

    // 4. Bids appear live in the drop-down under the job, without reloading. The customer picks one.
    await expect(page.getByText("Bids (2)")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /^Alpha Lawn Co/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Bravo Yard Pros/ })).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Choose Alpha Lawn Co" }).click();
    const waiting = page.getByTestId("waiting-panel");
    await expect(waiting.getByText("Waiting for Alpha Lawn Co to confirm")).toBeVisible();
    await expect(waiting.getByRole("timer")).toHaveText(/^[45]:\d\d$/);
    // No chat yet: it opens only once the provider commits (owner decision 2026-11-12).
    await expect(page.getByLabel("Message", { exact: true })).toHaveCount(0);

    // 5. Alpha is alerted on any page and confirms the job and price with an arrival time.
    await alpha.goto("/provider/marketplace?tab=bids");
    const alert = alpha.getByTestId("pending-alert");
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await alert.getByRole("link").first().click();
    const confirmPanel = alpha.getByTestId("confirm-panel");
    await expect(confirmPanel.getByRole("timer")).toHaveText(/^[45]:\d\d$/);
    await expect(alpha.getByLabel("Message", { exact: true })).toHaveCount(0); // no chat before confirming
    await expect(alpha.getByText("1100 Bluebonnet Ln")).toHaveCount(0); // address only after confirming
    await confirmPanel.getByRole("button", { name: "Confirm job" }).click();
    await expect(alpha.getByText("1100 Bluebonnet Ln")).toBeVisible();
    await expect(alpha.getByText("512-555-0199")).toBeVisible();
    await expect(alpha.getByTestId("confirm-panel")).toHaveCount(0);
    await bravo.goto("/provider/marketplace?tab=bids");
    await expect(bravo.getByText("Not chosen")).toBeVisible();

    // 6. The customer sees the confirmation live, and the chat opens under the job for both sides.
    await expect(page.getByText("Alpha Lawn Co confirmed · $65.00")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^Arriving /)).toBeVisible();
    await page.getByLabel("Message", { exact: true }).fill("Hi, I'm Riley. Gate code is 4512");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("Hi, I'm Riley. Gate code is 4512")).toBeVisible();
    await expect(alpha.getByText("Hi, I'm Riley. Gate code is 4512")).toBeVisible({ timeout: 15_000 });
    await alpha.getByLabel("Message", { exact: true }).fill("Thanks Riley, see you then!");
    await alpha.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("Thanks Riley, see you then!")).toBeVisible({ timeout: 15_000 });
    await page.goto(requestPath);
    await expect(page.getByText("Agreed price")).toBeVisible();

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

    // 8. One step to finish (owner request 2026-11-12): "Mark job completed" → form of payment → Cash.
    await alpha.reload();
    const finish = alpha.getByTestId("finish-job");
    await finish.getByRole("button", { name: "Mark job completed" }).click();
    await expect(finish.getByRole("radiogroup", { name: "Form of payment" })).toBeVisible();
    await finish.getByRole("radio", { name: /^Cash Paid in person/ }).click();
    await finish.getByRole("button", { name: "Mark paid & complete job" }).click();
    await expect(alpha.getByTestId("finish-job")).toHaveCount(0); // the page refreshes into its completed state
    await expect(alpha.getByTestId("job-completed")).toBeVisible();
    // The paid invoice and a thank-you went to the customer in the chat; the job is completed and paid.
    await alpha.reload();
    await expect(alpha.getByText(/The job is done! Paid \$80\.00 by cash/)).toBeVisible();
    await expect(alpha.getByText("completed", { exact: true }).first()).toBeVisible();

    // 9. The homeowner's dashboard asks them to rate the provider; the public profile reflects it.
    await page.goto("/customer");
    const rate = page.getByTestId("rate-provider");
    await expect(rate.getByText("Job completed! How did Alpha Lawn Co do?")).toBeVisible();
    await rate.getByRole("radio", { name: "5 stars" }).click();
    await rate.getByLabel("Comments (optional)").fill("On time and did a great job.");
    await rate.getByRole("button", { name: "Post review" }).click();
    await expect(page.getByTestId("rate-provider")).toHaveCount(0);
    await page.goto(requestPath);
    await expect(page.getByRole("heading", { name: "Your review" })).toBeVisible();
    await page.getByRole("link", { name: "Alpha Lawn Co" }).first().click();
    // Previous pages stay mounted (hidden) for instant back-navigation, so look at visible text only.
    await expect(page.getByText("5.0").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("On time and did a great job.").filter({ visible: true })).toBeVisible();
    await expect(page.getByText(/1 job completed on DoneZo/).filter({ visible: true })).toBeVisible();
  });

  test("the customer can give the chosen provider 10 more minutes, or drop them and pick another bid", async ({ page, browser }) => {
    test.setTimeout(150_000);
    const slow = await marketplaceProvider(browser, "Slow Mow Co");
    const backup = await marketplaceProvider(browser, "Backup Lawn Co");
    const description = `Countdown test yard, ref ${Date.now()}`;
    const requestId = await postJobAsNewCustomer(page, description);
    await sendBid(slow, description, "60", "Mow", "Today");
    await sendBid(backup, description, "62", "Mow and edge", "Tomorrow");
    await expect(page.getByText("Bids (2)")).toBeVisible({ timeout: 15_000 });
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Choose Slow Mow Co" }).click();
    const waiting = page.getByTestId("waiting-panel");
    await expect(waiting).toBeVisible();
    await expect(waiting.getByRole("button", { name: "Give them 10 more minutes" })).toHaveCount(0); // not before 2:00

    // Fast-forward: only 1:30 left. The options appear.
    await serviceClient().from("bookings").update({ confirm_by: new Date(Date.now() + 90_000).toISOString() }).eq("request_id", requestId).eq("status", "pending");
    await page.reload();
    await waiting.getByRole("button", { name: "Give them 10 more minutes" }).click();
    await expect(waiting.getByRole("timer")).toHaveText(/^1[01]:\d\d$/);

    await serviceClient().from("bookings").update({ confirm_by: new Date(Date.now() + 60_000).toISOString() }).eq("request_id", requestId).eq("status", "pending");
    await page.reload();
    page.once("dialog", (d) => d.accept());
    await waiting.getByRole("button", { name: "Drop provider" }).click();
    // Back to the bids: only Backup's is left; the dropped provider is told.
    await expect(page.getByText("Bids (1)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Choose Backup Lawn Co" })).toBeVisible();
    await slow.goto("/provider/marketplace?tab=bids");
    await expect(slow.getByText("Not confirmed in time")).toBeVisible();
  });

  test("house cleaning asks type of home, size, bathrooms and which rooms (several allowed)", async ({ page }) => {
    await page.goto("/post-job?category=house-cleaning");
    await page.waitForLoadState("networkidle");
    await page.getByTestId("request-photos").setInputFiles({ name: "room.png", mimeType: "image/png", buffer: PNG });
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("What needs to be done?").fill("Two-bedroom apartment, regular clean");
    await page.getByRole("button", { name: "Apartment" }).click();
    await page.getByRole("button", { name: "1,000–1,500 sq ft" }).click();
    await page.getByRole("group", { name: /^Bathrooms/ }).getByRole("button", { name: "2", exact: true }).click();
    await page.getByRole("button", { name: "Kitchen" }).click();
    await page.getByRole("button", { name: "Living room" }).click();
    await page.getByRole("button", { name: "Bathrooms", exact: true }).click();
    await expect(page.getByRole("button", { name: "Kitchen" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Living room" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Living room" }).click(); // tap again to unselect
    await expect(page.getByRole("button", { name: "Living room" })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("radio", { name: "Tomorrow" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Street address").fill("1 Test Ave");
    await page.getByLabel("ZIP code").fill("78745");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText(/Apartment · 1,000–1,500 sq ft · 2 · Kitchen, Bathrooms/)).toBeVisible();
  });

  test("a provider can hide a job from their board and unhide it", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const pro = await marketplaceProvider(browser, "Picky Lawn Co");
    const description = `Hide test yard, ref ${Date.now()}`;
    await postJobAsNewCustomer(page, description);
    await pro.goto("/provider/marketplace");
    const card = pro.locator("li").filter({ hasText: description });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Hide this job" }).click();
    await expect(pro.locator("li").filter({ hasText: description })).toHaveCount(0);
    await pro.getByRole("link", { name: /^Hidden jobs \(\d+\)$/ }).click();
    const hidden = pro.locator("li").filter({ hasText: description });
    await expect(hidden).toBeVisible();
    await hidden.getByRole("button", { name: "Show this job again" }).click();
    await expect(pro.locator("li").filter({ hasText: description })).toHaveCount(0);
    await pro.getByRole("link", { name: "← Back to jobs near you" }).click();
    await expect(pro.locator("li").filter({ hasText: description })).toBeVisible();
  });

  test("ZIP codes outside the Austin area are turned away", async ({ page }) => {
    await page.goto("/post-job?category=lawn-mowing");
    await page.waitForLoadState("networkidle");
    // Photos are required: no way past this step without one (owner decision 2026-11-12).
    await expect(page.getByRole("button", { name: "Add a photo to continue" })).toBeDisabled();
    await page.getByTestId("request-photos").setInputFiles({ name: "yard.png", mimeType: "image/png", buffer: PNG });
    await page.getByRole("button", { name: "Continue" }).click();
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
