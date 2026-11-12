/**
 * Phase 6 launch checks: who can open what, the support workflow, legal pages,
 * and a phone-size sweep of every main page (no sideways scrolling, no blocked resources, no server errors).
 */
import { expect, test, type Browser, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createAdminUser, latestEmail, extractCode, serviceClient, uniqueEmail } from "./helpers";

type Person = { email: string; password: string; id: string };

async function makeProvider(name: string): Promise<Person & { businessId: string }> {
  const db = serviceClient();
  const email = uniqueEmail("launch-pro"), password = `Pw-${randomUUID()}1`;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: "provider", business_name: name, full_name: "Olivia Owner", marketplace_enabled: true } });
  if (error) throw error;
  const { data: m } = await db.from("business_members").select("business_id").eq("user_id", data.user.id).single();
  await db.from("business_subscriptions").upsert({ business_id: m!.business_id, status: "active" });
  return { email, password, id: data.user.id, businessId: m!.business_id };
}

async function makeEmployee(businessId: string, ownerId: string): Promise<Person> {
  const db = serviceClient();
  const email = uniqueEmail("launch-crew"), password = `Pw-${randomUUID()}1`;
  const { data: inv, error } = await db.from("business_invitations").insert({ business_id: businessId, email, full_name: "Evan Employee", role: "employee", invited_by: ownerId }).select().single();
  if (error) throw error;
  const { data } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { invite_token: inv.token, full_name: "Evan Employee" } });
  return { email, password, id: data.user!.id };
}

async function seedJob(businessId: string) {
  const db = serviceClient();
  const { data: c } = await db.from("crm_customers").insert({ business_id: businessId, full_name: "Private Customer", phone: "512-555-0199" }).select().single();
  const { data: j } = await db.from("jobs").insert({ business_id: businessId, customer_id: c!.id, title: "Gutter clean", price_cents: 15000, status: "scheduled", scheduled_start: new Date(Date.now() + 86_400_000).toISOString() }).select().single();
  return { customerId: c!.id as string, jobId: j!.id as string };
}

async function signInWithPassword(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Provider or admin" }).click();
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

async function signInCustomer(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText("We sent a 6-digit code")).toBeVisible();
  await page.getByLabel("Code").fill(extractCode((await latestEmail(email)).html));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL((u) => u.pathname.startsWith("/customer"));
}

/** Where you end up after asking for `path` (waits for redirects that happen while the page streams). */
async function landing(page: Page, path: string, expected: string) {
  await page.goto(path);
  await expect.poll(() => new URL(page.url()).pathname, { message: `${path} should land on ${expected}`, timeout: 10_000 }).toBe(expected);
}

test.describe("who can open what", () => {
  test("every role is kept to its own area, and providers can't open each other's records", async ({ browser }) => {
    test.setTimeout(120_000);
    const owner = await makeProvider("Matrix Co");
    const other = await makeProvider("Other Co");
    const employee = await makeEmployee(owner.businessId, owner.id);
    const admin = await createAdminUser();
    const { customerId, jobId } = await seedJob(owner.businessId);
    const ctx = async () => (await browser.newContext()).newPage();

    const anon = await ctx();
    for (const p of ["/provider", "/provider/reports", "/customer", "/admin", "/provider/reports/export"]) {
      await landing(anon, p, "/login");
    }

    const emp = await ctx();
    await signInWithPassword(emp, employee);
    for (const p of ["/provider", "/provider/customers", `/provider/customers/${customerId}`, "/provider/invoices", "/provider/payments", "/provider/reports",
      "/provider/employees", "/provider/settings", "/provider/marketplace", "/provider/recurring", "/provider/jobs/new"]) {
      await landing(emp, p, "/provider/my-jobs");
    }
    await landing(emp, "/admin", "/provider/my-jobs");
    // Not assigned to this job → it doesn't exist for them.
    await emp.goto(`/provider/jobs/${jobId}`);
    await expect(emp.getByRole("heading", { name: "Page not found" })).toBeVisible();

    const rival = await ctx();
    await signInWithPassword(rival, other);
    for (const p of [`/provider/customers/${customerId}`, `/provider/jobs/${jobId}`]) {
      await rival.goto(p);
      await expect(rival.getByRole("heading", { name: "Page not found" }), p).toBeVisible();
      await expect(rival.getByText("Private Customer")).toHaveCount(0);
    }
    await landing(rival, "/admin", "/provider");
    await landing(rival, "/customer", "/provider");

    const cust = await ctx();
    await signInCustomer(cust, uniqueEmail("launch-cust"));
    for (const p of ["/provider", "/provider/payments", "/provider/reports", "/admin"]) {
      await landing(cust, p, "/customer");
    }
    const csv = await cust.request.get("/provider/reports/export", { maxRedirects: 0 });
    expect(csv.status()).not.toBe(200);

    const adm = await ctx();
    await signInWithPassword(adm, admin);
    await landing(adm, "/provider", "/admin");
    await landing(adm, "/customer", "/admin");
  });
});

test("support: a customer asks, an admin replies, the customer sees the reply and a notification", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const email = uniqueEmail("help-cust");
  const tag = randomUUID().slice(0, 6);
  await signInCustomer(page, email);
  await page.goto("/help");
  await page.getByLabel("Topic").selectOption("payment");
  await page.getByLabel("Subject").fill(`Charged twice? ${tag}`);
  await page.getByLabel("How can we help?").fill("I think my card was charged twice for invoice 12.");
  await page.getByRole("button", { name: "Send to support" }).click();
  await expect(page.getByText("Thanks, your message was sent.")).toBeVisible();
  await expect(page.getByText("Waiting for reply")).toBeVisible();

  const admin = await createAdminUser();
  const adm = await (await browser.newContext()).newPage();
  await signInWithPassword(adm, admin);
  await adm.goto("/admin/reports");
  const item = adm.locator("div").filter({ hasText: `Charged twice? ${tag}` }).filter({ has: adm.getByRole("button", { name: "Send reply & resolve" }) }).last();
  await item.getByRole("textbox").fill(`Only one charge went through (${tag}); the other was a pending hold.`);
  await item.getByRole("button", { name: "Send reply & resolve" }).click();
  await expect(adm.getByText(`Reply: Only one charge went through (${tag})`, { exact: false })).toBeVisible({ timeout: 15_000 });

  await page.goto("/help");
  await expect(page.getByText("Answered")).toBeVisible();
  await expect(page.getByText(`Only one charge went through (${tag})`, { exact: false })).toBeVisible();
  await page.goto("/customer/notifications");
  await expect(page.getByText("Support replied to your request")).toBeVisible();
});

test("legal pages are reachable from every footer and clearly marked as drafts", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "Privacy" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
  await expect(page.getByText("Draft, not yet reviewed by a lawyer.")).toBeVisible();
  await page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "Terms" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Terms of service" })).toBeVisible();
  await expect(page.getByText("$9.99 per month")).toBeVisible();
  await expect(page.getByText("10% of the payment")).toBeVisible();
  await page.goto("/signup/provider");
  await expect(page.getByRole("link", { name: "Terms" }).filter({ visible: true })).toBeVisible();
});

// ---------------------------------------------------------------- phone sweep

async function sweep(browser: Browser, page: Page, paths: string[]) {
  const problems: string[] = [];
  page.on("console", (m) => { if (/Content Security Policy|Refused to (load|connect|execute)/i.test(m.text())) problems.push(`CSP: ${m.text().slice(0, 160)}`); });
  page.on("pageerror", (e) => problems.push(`script error: ${e.message.slice(0, 160)}`));
  for (const path of paths) {
    const res = await page.goto(path);
    if (res && res.status() >= 500) problems.push(`${path}: HTTP ${res.status()}`);
    await page.locator("h1").filter({ visible: true }).first().waitFor({ timeout: 5_000 }).catch(() => problems.push(`${path}: no heading`));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) problems.push(`${path}: ${overflow}px sideways scroll`);
  }
  void browser;
  expect(problems).toEqual([]);
}

test.describe("phone sweep @mobile", () => {
  test("public pages fit a phone @mobile", async ({ page, browser }) => {
    test.setTimeout(120_000);
    await sweep(browser, page, ["/", "/for-providers", "/post-job", "/login", "/signup", "/signup/provider", "/signup/customer", "/forgot-password", "/help", "/privacy", "/terms"]);
  });

  test("every provider page fits a phone @mobile", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const owner = await makeProvider("Phone Sweep Lawn");
    const { customerId, jobId } = await seedJob(owner.businessId);
    await signInWithPassword(page, owner);
    await sweep(browser, page, ["/provider", "/provider/calendar", "/provider/calendar?view=day", "/provider/calendar?view=month", "/provider/customers",
      "/provider/customers/new", `/provider/customers/${customerId}`, "/provider/jobs", "/provider/jobs/new", `/provider/jobs/${jobId}`, "/provider/recurring",
      "/provider/recurring/new", "/provider/invoices", "/provider/invoices/new", "/provider/payments", "/provider/marketplace", "/provider/marketplace/profile",
      "/provider/notifications", "/provider/employees", "/provider/reports", "/provider/route", "/provider/settings", "/help"]);
  });

  test("employee, customer and admin pages fit a phone @mobile", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const owner = await makeProvider("Phone Sweep Crew");
    const employee = await makeEmployee(owner.businessId, owner.id);
    await signInWithPassword(page, employee);
    await sweep(browser, page, ["/provider/my-jobs", "/provider/calendar", "/provider/route", "/provider/notifications"]);

    const custPage = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
    await signInCustomer(custPage, uniqueEmail("phone-cust"));
    await sweep(browser, custPage, ["/customer", "/customer/requests", "/customer/messages", "/customer/payments", "/customer/notifications", "/customer/account", "/help"]);

    const admPage = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
    await signInWithPassword(admPage, await createAdminUser());
    await sweep(browser, admPage, ["/admin", "/admin/users", "/admin/businesses", "/admin/categories", "/admin/marketplace", "/admin/service-areas", "/admin/payments", "/admin/reports", "/admin/audit-log"]);
  });
});
