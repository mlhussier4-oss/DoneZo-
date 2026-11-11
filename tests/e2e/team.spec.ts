import { expect, test } from "@playwright/test";
import { atPath, businessIdForEmail, latestEmail, serviceClient, signUpProvider, uniqueEmail } from "./helpers";

/** Today's date in the business's time zone (new businesses default to America/New_York). */
const todayNY = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());

async function seedJobs(ownerEmail: string) {
  const db = serviceClient();
  const businessId = await businessIdForEmail(ownerEmail);
  const day = todayNY();
  const jobs: string[] = [];
  for (const [name, street, zip, hour] of [["Pat Assigned", "100 Congress Ave", "78701", 16], ["Lee Other", "5 Burnet Rd", "78757", 18]] as const) {
    const { data: c } = await db.from("crm_customers").insert({ business_id: businessId, full_name: name, phone: "512-555-0101" }).select().single();
    const { data: a } = await db.from("crm_customer_addresses").insert({ business_id: businessId, customer_id: c!.id, line1: street, city: "Austin", state: "TX", postal_code: zip, is_primary: true }).select().single();
    const { data: j, error } = await db.from("jobs").insert({
      business_id: businessId, customer_id: c!.id, address_id: a!.id, title: `Clean for ${name}`, price_cents: 12000, status: "scheduled",
      scheduled_start: `${day}T${hour}:00:00Z`, scheduled_end: `${day}T${hour + 1}:00:00Z`,
    }).select().single();
    if (error) throw error;
    jobs.push(j!.id);
  }
  return { day, assignedJob: jobs[0], otherJob: jobs[1] };
}

test.describe("Team: employees see and do only their assigned work", () => {
  test("invite → employee joins by email → assignment → employee completes the job → reports and route", async ({ page, browser }) => {
    test.setTimeout(150_000);
    const ownerEmail = uniqueEmail("teamowner");
    await signUpProvider(page, { usage: "crm", businessName: "Sparkle Cleaning", email: ownerEmail });
    const { day, assignedJob, otherJob } = await seedJobs(ownerEmail);

    // 1. Owner invites an employee.
    await page.goto("/provider/employees");
    await expect(page.getByRole("heading", { level: 1, name: "Team" })).toBeVisible();
    const crewEmail = uniqueEmail("crew");
    await page.getByLabel("Email").fill(crewEmail);
    await page.getByLabel("Name (optional)").fill("Riley Crew");
    await page.getByRole("button", { name: "Send invite" }).click();
    await expect(page.getByText(`Invitation sent to ${crewEmail}.`)).toBeVisible();
    await expect(page.getByText("Invited", { exact: true })).toBeVisible();

    // 2. The employee accepts from the email and chooses a password.
    const mail = await latestEmail(crewEmail);
    expect(mail.subject).toContain("invited");
    expect(mail.html).toContain("Sparkle Cleaning");
    const link = mail.html.match(/href="([^"]*\/auth\/confirm\?[^"]*)"/)![1].replaceAll("&amp;", "&");
    const crewCtx = await browser.newContext();
    const crew = await crewCtx.newPage();
    await crew.goto(link);
    await expect(crew).toHaveURL(/\/account\/update-password/);
    await crew.getByLabel("New password", { exact: true }).fill("Crew-password-9");
    await crew.getByLabel("Confirm new password").fill("Crew-password-9");
    await crew.getByRole("button", { name: /password/i }).click();
    await crew.goto("/provider");
    await expect(crew).toHaveURL(atPath("/provider/my-jobs"));
    await expect(crew.getByText("No jobs assigned yet")).toBeVisible();
    const crewNav = crew.getByRole("navigation", { name: "Business navigation" }).first();
    await expect(crewNav.getByRole("link", { name: "Invoices" })).toHaveCount(0);
    await expect(crewNav.getByRole("link", { name: "Payments" })).toHaveCount(0);

    // 3. Owner sees the new member and assigns one job.
    await page.reload();
    await expect(page.getByText("Riley Crew").first()).toBeVisible();
    await page.goto(`/provider/jobs/${assignedJob}`);
    await page.getByRole("checkbox", { name: /Riley Crew/ }).check();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.goto("/provider/calendar?view=day");
    await page.getByRole("link", { name: "Riley Crew" }).click();
    await expect(page.getByRole("link", { name: /Clean for Pat Assigned/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Clean for Lee Other/ })).toHaveCount(0);
    await page.getByRole("link", { name: "Unassigned" }).click();
    await expect(page.getByRole("link", { name: /Clean for Lee Other/ })).toBeVisible();

    // 4. The employee sees only that job, without invoices, payments or editing, and completes it.
    await crew.goto("/provider/my-jobs");
    await expect(crew.getByRole("link", { name: /Clean for Pat Assigned/ })).toBeVisible();
    await expect(crew.getByText("Clean for Lee Other")).toHaveCount(0);
    await crew.getByRole("link", { name: /Clean for Pat Assigned/ }).click();
    await expect(crew.getByRole("heading", { level: 1, name: "Clean for Pat Assigned" })).toBeVisible();
    await expect(crew.getByText("100 Congress Ave, Austin, TX").filter({ visible: true })).toBeVisible();
    await expect(crew.getByRole("link", { name: "Edit job" })).toHaveCount(0);
    await expect(crew.getByRole("button", { name: "Create invoice" })).toHaveCount(0);
    await crew.getByRole("button", { name: "Start job" }).click();
    await expect(crew.getByText("In progress").first()).toBeVisible();
    await crew.getByRole("button", { name: "Mark complete" }).click();
    await expect(crew.getByText("Completed").first()).toBeVisible();
    // Typing other addresses gets them nowhere.
    await crew.goto(`/provider/jobs/${otherJob}`);
    await expect(crew.getByText("Clean for Lee Other")).toHaveCount(0);
    await crew.goto("/provider/customers");
    await expect(crew).toHaveURL(atPath("/provider/my-jobs"));
    await crew.goto("/provider/reports");
    await expect(crew).toHaveURL(atPath("/provider/my-jobs"));
    expect((await crew.request.get("/provider/reports/export", { maxRedirects: 0 })).status()).not.toBe(200);
    await crewCtx.close();

    // 5. Owner: the report credits Riley; the CSV downloads; the day's route lists both stops.
    await page.goto("/provider/reports");
    const byPerson = page.locator("table").filter({ hasText: "Person" });
    await expect(byPerson.getByRole("row", { name: /Riley Crew 1 \$120\.00/ })).toBeVisible();
    const csv = await page.request.get("/provider/reports/export?range=month");
    expect(csv.headers()["content-type"]).toContain("text/csv");
    expect(await csv.text()).toContain("Date,Customer,Invoice,Job,Method,Confirmation,Amount,Refunded,Net,DoneZo fee,Note");

    await page.goto(`/provider/route?date=${day}`);
    await expect(page.getByText("2 stops")).toBeVisible();
    const maps = page.getByRole("link", { name: /Open in Google Maps/ });
    await expect(maps).toHaveAttribute("href", /google\.com\/maps\/dir\/.*100\+Congress\+Ave/);
  });
});
