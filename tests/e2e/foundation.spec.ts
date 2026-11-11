import { expect, test } from "@playwright/test";
import { atPath, createAdminUser, deleteTestCategories, signInAsAdmin, signInWithCode, signUpProvider, uniqueEmail } from "./helpers";

test.describe("public site", () => {
  test("homepage shows the promise and every service", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Post a job. Receive bids. Choose your provider.");
    for (const name of ["Junk removal", "Lawn mowing", "Pet waste pickup", "Pressure washing", "House cleaning", "Turf installation"]) {
      await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
    }
  });

  test("protected areas send signed-out visitors to log in", async ({ page }) => {
    for (const path of ["/provider", "/customer", "/admin", "/provider/settings"]) {
      await page.goto(path);
      await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("next") === path);
    }
  });
});

test.describe("provider accounts", () => {
  test("CRM-only provider: signs up, never sees the marketplace, and can switch it on later", async ({ page }) => {
    const email = uniqueEmail("crm");
    await signUpProvider(page, { usage: "crm", businessName: "Green Blade Lawn Care", email });

    await expect(page.getByText("Green Blade Lawn Care · DoneZo Pro", { exact: true })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Business navigation" }).first();
    await expect(nav.getByRole("link", { name: "Customers" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Marketplace" })).toHaveCount(0);

    // Typing the marketplace URL directly is blocked on the server.
    await page.goto("/provider/marketplace");
    await expect(page).toHaveURL(atPath("/provider/settings"));

    // Turn the marketplace on: same account, nothing moved.
    await page.getByRole("button", { name: "Turn on marketplace access" }).click();
    await expect(page.getByText("Marketplace access is on.")).toBeVisible();
    await expect(nav.getByRole("link", { name: "Marketplace" })).toBeVisible();
    await nav.getByRole("link", { name: "Marketplace" }).click();
    await expect(page.getByRole("heading", { name: "Marketplace" })).toBeVisible();

    // And off again.
    await page.goto("/provider/settings");
    await page.getByRole("button", { name: "Turn off marketplace access" }).click();
    await expect(page.getByText(/Marketplace access is off/)).toBeVisible();
    await expect(nav.getByRole("link", { name: "Marketplace" })).toHaveCount(0);
  });

  test("Marketplace provider: signs up with the marketplace already on", async ({ page }) => {
    await signUpProvider(page, { usage: "marketplace", businessName: "Shine Pressure Washing", email: uniqueEmail("mkt") });
    await expect(page.getByText("Shine Pressure Washing · DoneZo Pro with the marketplace")).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Business navigation" }).first();
    await expect(nav.getByRole("link", { name: "Marketplace" })).toBeVisible();
  });

  test("provider can edit business details, sign out and sign back in with a password", async ({ page }) => {
    const email = uniqueEmail("edit");
    const { password } = await signUpProvider(page, { usage: "crm", businessName: "Old Name LLC", email });

    await page.goto("/provider/settings");
    await page.getByLabel("Business name").fill("New Name LLC");
    await page.getByLabel("Business phone").fill("555-0142");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(atPath("/"));
    await page.goto("/provider");
    await expect(page).toHaveURL(/\/login/);

    await page.getByRole("tab", { name: "Provider or admin" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(atPath("/provider"));
    await expect(page.getByText("New Name LLC · DoneZo Pro", { exact: true })).toBeVisible();
  });

  test("wrong password shows a clear error", async ({ page }) => {
    const email = uniqueEmail("wrong");
    await signUpProvider(page, { usage: "crm", businessName: "Wrong Pw Co", email });
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await page.goto("/login?next=/provider");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That email and password don't match")).toBeVisible();
  });

  test("a provider cannot open customer or admin areas", async ({ page }) => {
    await signUpProvider(page, { usage: "crm", businessName: "Nosy Co", email: uniqueEmail("nosy") });
    await page.goto("/admin");
    await expect(page).toHaveURL(atPath("/provider"));
    await page.goto("/customer");
    await expect(page).toHaveURL(atPath("/provider"));
  });
});

test.describe("customer accounts", () => {
  test("customer signs up with an email code (no password) and can edit their profile", async ({ page }) => {
    const email = uniqueEmail("cust");
    await signInWithCode(page, email, { path: "/signup/customer", fullName: "Casey Homeowner" });
    await expect(page).toHaveURL(atPath("/customer"));
    await expect(page.getByRole("heading", { name: "Hi, Casey" })).toBeVisible();

    await page.getByRole("navigation", { name: "My account navigation" }).first().getByRole("link", { name: "Account" }).click();
    await page.getByLabel("Phone").fill("555-0199");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
  });

  test("a wrong code is rejected", async ({ page }) => {
    const email = uniqueEmail("badcode");
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Email me a code" }).click();
    await page.getByLabel("Code").fill("000000");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("That code is incorrect or has expired")).toBeVisible();
  });

  test("a customer cannot open provider or admin areas", async ({ page }) => {
    await signInWithCode(page, uniqueEmail("cust2"));
    await expect(page).toHaveURL(atPath("/customer"));
    for (const path of ["/provider", "/provider/settings", "/admin", "/admin/users"]) {
      await page.goto(path);
      await expect(page).toHaveURL(atPath("/customer"));
    }
  });
});

test.describe("administrators", () => {
  test.afterEach(deleteTestCategories);

  test("admin signs in, manages a category (shown on the homepage) and sees it in the audit log", async ({ page }) => {
    await signInAsAdmin(page, await createAdminUser());
    await expect(page.getByRole("heading", { name: "Platform overview" })).toBeVisible();

    const name = `Gutter cleaning ${Date.now()}`;
    const slug = `e2e-gutter-cleaning-${Date.now()}`;
    await page.goto("/admin/categories");
    const addForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Add category" }) });
    await addForm.getByLabel("Name").fill(name);
    await addForm.getByLabel("Slug (used in links)").fill(slug);
    await addForm.getByLabel("Order").fill("50");
    await addForm.getByRole("button", { name: "Add category" }).click();
    await expect(page.getByText("Category added.")).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();

    await page.goto("/admin/audit-log");
    await expect(page.getByText("service_category.create").first()).toBeVisible();
    await expect(page.getByText(slug)).toBeVisible();
  });

  test("admin can suspend a user, who is then locked out", async ({ page, browser }) => {
    const email = uniqueEmail("suspendme");
    const custContext = await browser.newContext();
    const custPage = await custContext.newPage();
    await signInWithCode(custPage, email);
    await expect(custPage).toHaveURL(atPath("/customer"));

    await signInAsAdmin(page, await createAdminUser());
    await page.goto("/admin/users");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("row", { name: new RegExp(email) }).getByRole("button", { name: "Suspend" }).click();
    await expect(page.getByRole("row", { name: new RegExp(email) }).getByText("Suspended")).toBeVisible();

    await custPage.goto("/customer");
    await expect(custPage).toHaveURL(/\/login\?error=suspended/);
    await expect(custPage.getByText("This account has been suspended")).toBeVisible();
    await custContext.close();
  });
});

test.describe("phone layout @mobile", () => {
  test("homepage and provider sign-up work on a phone without sideways scrolling @mobile", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.getByRole("link", { name: "Post a job" }).first()).toBeVisible();

    await signUpProvider(page, { usage: "crm", businessName: "Phone Co", email: uniqueEmail("phone") });
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer.getByRole("link", { name: "Business settings" })).toBeVisible();
    await drawer.getByRole("link", { name: "Business settings" }).click();
    await expect(page.getByRole("heading", { name: "Business settings" })).toBeVisible();
    const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow2).toBeLessThanOrEqual(0);
  });
});
