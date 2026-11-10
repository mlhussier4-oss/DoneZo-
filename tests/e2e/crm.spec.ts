import { expect, test, type Page } from "@playwright/test";
import { atPath, signUpProvider, uniqueEmail } from "./helpers";

// A real 1×1 PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function addCustomer(page: Page, name: string, opts: { street?: string } = {}) {
  await page.goto("/provider/customers/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Phone").fill("555-0123");
  await page.getByLabel("Email").fill(uniqueEmail("homeowner"));
  if (opts.street) {
    await page.getByLabel("Street address").fill(opts.street);
    await page.getByLabel("City").fill("Springfield");
    await page.getByLabel("State").fill("IL");
    await page.getByLabel("ZIP code").fill("62701");
  }
  await page.getByLabel("First note (optional)").fill("Dog in the back yard");
  await page.getByRole("button", { name: "Add customer" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  return page.url().split("/").pop()!;
}

test.describe("CRM-only provider runs their business without the marketplace", () => {
  test("customer → recurring service → calendar → job with photo → invoice → customer link → payments → dashboard", async ({ page, browser }) => {
    test.setTimeout(120_000);
    await signUpProvider(page, { usage: "crm", businessName: "Green Blade Lawn Care", email: uniqueEmail("crmflow") });
    const nav = page.getByRole("navigation", { name: "Business navigation" }).first();
    await expect(nav.getByRole("link", { name: "Marketplace" })).toHaveCount(0);

    // 1. Add an outside customer.
    const customerId = await addCustomer(page, "Dana Whitfield", { street: "12 Oak St" });
    await expect(page.getByText("12 Oak St")).toBeVisible();
    await expect(page.getByText("Dog in the back yard")).toBeVisible();

    // 2. Weekly recurring mowing, starting today.
    await page.getByRole("link", { name: "Recurring service" }).click();
    await page.getByLabel("Service title").fill("Weekly mow");
    await page.getByLabel("Price per visit ($)").fill("45");
    await page.getByRole("button", { name: "Create recurring service" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Weekly mow" })).toBeVisible();
    // 13–14 visits over 90 days; today's may already count as past depending on the time of day.
    await expect(page.getByRole("heading", { name: /Upcoming visits \(1[234]\)/ })).toBeVisible();

    // 3. The visits are on the calendar (month view shows them).
    await page.goto("/provider/calendar?view=month");
    await expect(page.getByRole("link", { name: /Weekly mow/ }).first()).toBeVisible();

    // 4. Open the first visit, do the job, add a photo.
    await page.goto(`/provider/customers/${customerId}`);
    await page.getByRole("link", { name: /Weekly mow/ }).first().click();
    await expect(page).toHaveURL(/\/provider\/jobs\//);
    await page.getByRole("button", { name: "Start job" }).click();
    await expect(page.getByText("In progress").first()).toBeVisible();
    await page.getByRole("button", { name: "Mark complete" }).click();
    await expect(page.getByText("Completed").first()).toBeVisible();

    await page.getByLabel("Photo caption").fill("After");
    await page.getByTestId("photo-input").setInputFiles({ name: "after.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByRole("img", { name: "After" })).toBeVisible();

    // 5. Invoice the job, send it.
    await page.getByRole("button", { name: "Create invoice" }).click();
    await expect(page.getByRole("heading", { level: 1, name: /Invoice #1/ })).toBeVisible();
    await expect(page.getByText("$45.00").first()).toBeVisible();
    await page.getByRole("button", { name: "Mark as sent" }).click();
    const link = await page.getByLabel("Customer link").inputValue();
    expect(link).toMatch(/\/i\/[0-9a-f]{48}$/);

    // 6. The customer opens the link without logging in.
    const anon = await browser.newContext();
    const customerView = await anon.newPage();
    await customerView.goto(link);
    await expect(customerView.getByRole("heading", { name: "Invoice from Green Blade Lawn Care" })).toBeVisible();
    await expect(customerView.getByText("$45.00 due")).toBeVisible();
    await anon.close();

    // 7. Record cash, then Venmo for the rest.
    await page.getByLabel("Amount ($)").fill("40");
    await page.getByLabel("Method").selectOption("cash");
    await page.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText("Partly paid")).toBeVisible();
    await expect(page.getByText("Recorded by you").first()).toBeVisible();
    // Wait for the refreshed form, which offers the remaining balance.
    await expect(page.getByLabel("Amount ($)")).toHaveValue("5.00");
    await page.getByLabel("Method").selectOption("venmo");
    await page.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByRole("button", { name: "Record payment" })).toHaveCount(0); // nothing left to pay
    await expect(page.getByText("Balance due")).toBeVisible();
    await expect(page.getByText("Recorded by you")).toHaveCount(2);

    // 8. The money shows up in the dashboard and payments list, from real data.
    await page.goto("/provider");
    await expect(page.getByRole("link", { name: /Revenue this month\s*\$45\.00/ })).toBeVisible();
    await page.goto("/provider/payments");
    await expect(page.getByRole("cell", { name: "Venmo" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Cash", exact: true })).toBeVisible();
    await page.goto("/provider/reports");
    await expect(page.getByText("Lawn mowing").or(page.getByText("Uncategorized")).first()).toBeVisible();
  });

  test("estimate is accepted and turned into an invoice with the same lines", async ({ page }) => {
    await signUpProvider(page, { usage: "crm", businessName: "Haul It Away", email: uniqueEmail("estimate") });
    await addCustomer(page, "Morgan Lee");
    const customerId = page.url().split("/").pop();
    await page.goto(`/provider/invoices/new?kind=estimate&customer=${customerId}`);
    await page.getByLabel("Line 1 description").fill("Haul away old couch");
    await page.getByLabel("Line 1 price").fill("120");
    await page.getByRole("button", { name: "Add line" }).click();
    await page.getByLabel("Line 2 description").fill("Disposal fee");
    await page.getByLabel("Line 2 quantity").fill("2");
    await page.getByLabel("Line 2 price").fill("15");
    await page.getByLabel("Tax (%)").fill("5");
    await page.getByRole("button", { name: "Save estimate" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Estimate #1" })).toBeVisible();
    await expect(page.getByText("$157.50").first()).toBeVisible(); // 150 + 5% tax
    await page.getByRole("button", { name: "Mark as sent" }).click();
    await page.getByRole("button", { name: "Customer accepted" }).click();
    await page.getByRole("button", { name: "Turn into invoice" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Invoice #1" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Haul away old couch" })).toBeVisible();
    await expect(page.getByText("$157.50").first()).toBeVisible();
  });

  test("customers can be searched and archived", async ({ page }) => {
    await signUpProvider(page, { usage: "crm", businessName: "Search Co", email: uniqueEmail("search") });
    await addCustomer(page, "Zelda Fitzgerald");
    await addCustomer(page, "Ernest Hemingway");
    await page.goto("/provider/customers?q=zel");
    await expect(page.getByText("Zelda Fitzgerald")).toBeVisible();
    await expect(page.getByText("Ernest Hemingway")).toHaveCount(0);

    await page.getByText("Zelda Fitzgerald").click();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Archive" }).click();
    await expect(page.getByText("Archived", { exact: true })).toBeVisible();
    await page.goto("/provider/customers");
    await expect(page.getByText("Zelda Fitzgerald")).toHaveCount(0);
    await page.goto("/provider/customers?view=archived");
    await expect(page.getByText("Zelda Fitzgerald")).toBeVisible();
  });
});

test("one provider cannot open another provider's customer, job or invoice pages", async ({ page, browser }) => {
  await signUpProvider(page, { usage: "crm", businessName: "Owner Co", email: uniqueEmail("owner") });
  const customerId = await addCustomer(page, "Private Customer");
  await page.getByRole("link", { name: "New job" }).click();
  await page.getByLabel("Job title").fill("Private job");
  await page.getByLabel("Price ($)").fill("80");
  await page.getByRole("button", { name: "Create job" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Private job" })).toBeVisible();
  const jobUrl = new URL(page.url()).pathname;
  await page.getByRole("button", { name: "Create invoice" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Invoice #1/ })).toBeVisible();
  const invoiceUrl = new URL(page.url()).pathname;

  const other = await browser.newContext();
  const intruder = await other.newPage();
  await signUpProvider(intruder, { usage: "crm", businessName: "Intruder Co", email: uniqueEmail("intruder") });
  for (const path of [`/provider/customers/${customerId}`, jobUrl, invoiceUrl]) {
    // The dashboard frame streams before the page runs, so the HTTP status can be 200;
    // what matters is that the database returned nothing and "Page not found" is shown.
    await intruder.goto(path);
    await expect(intruder.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(intruder.getByText("Private")).toHaveCount(0);
  }
  await intruder.goto("/provider/customers");
  await expect(intruder.getByText("Private Customer")).toHaveCount(0);
  await expect(intruder).toHaveURL(atPath("/provider/customers"));
  await other.close();
});
