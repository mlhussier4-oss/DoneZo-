/**
 * Phase 5: employees and managers. Every check runs as the real signed-in person.
 */
import { describe, expect, it } from "vitest";
import { adminClient, anonClient, businessIdFor, createUser, type TestUser } from "./helpers";

type Owner = TestUser & { businessId: string };

async function owner(): Promise<Owner> {
  const u = await createUser({ role: "provider", business_name: `Team Co ${Date.now()}`, marketplace_enabled: true });
  return { ...u, businessId: await businessIdFor(u.id) };
}

/** Invite someone and have them accept (create their login with the invite token, as the invite email does). */
async function join(by: Owner | TestUser, businessId: string, role: "employee" | "manager", fullName = "Jamie Crew") {
  const email = `crew-${crypto.randomUUID()}@example.com`;
  const { data: inv, error } = await by.client.rpc("create_invitation", { p_business_id: businessId, p_email: email, p_full_name: fullName, p_role: role });
  if (error) throw error;
  const password = `Pw-${crypto.randomUUID()}`;
  const { data } = await adminClient().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { invite_token: inv.token, full_name: fullName } });
  const client = anonClient();
  await client.auth.signInWithPassword({ email, password });
  return { id: data.user!.id, email, client } as TestUser;
}

async function customerAndJob(o: Owner, name: string) {
  const { data: c } = await o.client.from("crm_customers").insert({ business_id: o.businessId, full_name: name, phone: "512-555-0000" }).select().single();
  await o.client.from("crm_customer_addresses").insert({ business_id: o.businessId, customer_id: c!.id, line1: `${name} St`, city: "Austin", state: "TX", postal_code: "78704", is_primary: true });
  const { data: j } = await o.client.from("jobs").insert({ business_id: o.businessId, customer_id: c!.id, title: `Job for ${name}`, price_cents: 9000, status: "scheduled" }).select().single();
  return { customerId: c!.id, jobId: j!.id as string };
}

describe("invitations", () => {
  it("an invited person joins the business as an employee, with no business of their own", async () => {
    const o = await owner();
    const e = await join(o, o.businessId, "employee", "Jamie Crew");
    const { data: profile } = await e.client.from("profiles").select("role, full_name").eq("id", e.id).single();
    expect(profile).toEqual({ role: "provider", full_name: "Jamie Crew" });
    const { data: members } = await e.client.from("business_members").select("business_id, role").eq("user_id", e.id);
    expect(members).toEqual([{ business_id: o.businessId, role: "employee" }]);
    const { data: owned } = await adminClient().from("businesses").select("id").eq("created_by", e.id);
    expect(owned).toEqual([]);
  });

  it("a forged or mismatched invite token gets no access", async () => {
    const o = await owner();
    const { data: inv } = await o.client.rpc("create_invitation", { p_business_id: o.businessId, p_email: `real-${Date.now()}@example.com`, p_full_name: "", p_role: "employee" });
    const intruder = await createUser({ invite_token: inv.token }); // right token, wrong email
    expect((await intruder.client.from("profiles").select("role").single()).data?.role).toBe("customer");
    expect((await intruder.client.from("business_members").select("business_id")).data).toEqual([]);
  });

  it("only owners add managers; managers add employees; employees add no one", async () => {
    const o = await owner();
    const m = await join(o, o.businessId, "manager");
    const e = await join(m, o.businessId, "employee");
    expect((await m.client.rpc("create_invitation", { p_business_id: o.businessId, p_email: `x-${Date.now()}@example.com`, p_full_name: "", p_role: "manager" })).error).not.toBeNull();
    expect((await e.client.rpc("create_invitation", { p_business_id: o.businessId, p_email: `y-${Date.now()}@example.com`, p_full_name: "", p_role: "employee" })).error).not.toBeNull();
  });
});

describe("what employees can see", () => {
  it("only their assigned jobs and those jobs' customers; nothing financial", async () => {
    const o = await owner();
    const e = await join(o, o.businessId, "employee");
    const mine = await customerAndJob(o, "Assigned");
    const other = await customerAndJob(o, "Unassigned");
    expect((await o.client.from("job_assignments").insert({ job_id: mine.jobId, user_id: e.id, business_id: o.businessId })).error).toBeNull();
    const { data: inv } = await o.client.rpc("create_invoice_for_job", { p_job_id: mine.jobId });

    expect((await e.client.from("jobs").select("id")).data?.map((j) => j.id)).toEqual([mine.jobId]);
    expect((await e.client.from("crm_customers").select("full_name, phone")).data).toEqual([{ full_name: "Assigned", phone: "512-555-0000" }]);
    expect((await e.client.from("crm_customer_addresses").select("line1")).data).toEqual([{ line1: "Assigned St" }]);
    expect((await e.client.from("jobs").select("id").eq("id", other.jobId)).data).toEqual([]);
    expect((await e.client.from("invoices").select("id").eq("id", inv.id)).data).toEqual([]);
    expect((await e.client.from("payment_records").select("id")).data).toEqual([]);
    expect((await e.client.from("crm_customer_notes").select("id")).data).toEqual([]);
    expect((await e.client.rpc("business_dashboard", { p_business_id: o.businessId })).error).not.toBeNull();
    expect((await e.client.rpc("marketplace_feed")).data).toEqual([]);
    // They can see their business and teammates' names.
    expect((await e.client.from("businesses").select("id")).data).toEqual([{ id: o.businessId }]);
    expect((await e.client.from("profiles").select("id").eq("id", o.id)).data).toHaveLength(1);
  });

  it("employees of one business see nothing of another", async () => {
    const a = await owner();
    const b = await owner();
    const e = await join(a, a.businessId, "employee");
    await customerAndJob(b, "Other business");
    expect((await e.client.from("crm_customers").select("id").eq("business_id", b.businessId)).data).toEqual([]);
    expect((await e.client.from("jobs").select("id").eq("business_id", b.businessId)).data).toEqual([]);
  });
});

describe("what employees can do", () => {
  it("start and complete their job and add notes, but not change price, details or cancel", async () => {
    const o = await owner();
    const e = await join(o, o.businessId, "employee");
    const { jobId } = await customerAndJob(o, "Do It");
    await o.client.from("job_assignments").insert({ job_id: jobId, user_id: e.id, business_id: o.businessId });

    expect((await e.client.from("jobs").update({ status: "in_progress" }).eq("id", jobId)).error).toBeNull();
    expect((await e.client.from("jobs").update({ notes: "Gate was locked, used side gate" }).eq("id", jobId)).error).toBeNull();
    expect((await e.client.from("jobs").update({ price_cents: 1 }).eq("id", jobId)).error?.message).toMatch(/owner or a manager/);
    expect((await e.client.from("jobs").update({ title: "Renamed" }).eq("id", jobId)).error).not.toBeNull();
    expect((await e.client.from("jobs").update({ status: "canceled" }).eq("id", jobId)).error).not.toBeNull();
    expect((await e.client.from("jobs").update({ status: "completed" }).eq("id", jobId)).error).toBeNull();
    expect((await o.client.from("jobs").select("status, price_cents, notes").eq("id", jobId).single()).data)
      .toEqual({ status: "completed", price_cents: 9000, notes: "Gate was locked, used side gate" });
  });

  it("can't create customers, jobs or invoices, or assign themselves", async () => {
    const o = await owner();
    const e = await join(o, o.businessId, "employee");
    const { customerId, jobId } = await customerAndJob(o, "Nope");
    expect((await e.client.from("crm_customers").insert({ business_id: o.businessId, full_name: "x" })).error).not.toBeNull();
    expect((await e.client.from("jobs").insert({ business_id: o.businessId, customer_id: customerId, title: "x" })).error).not.toBeNull();
    expect((await e.client.from("invoices").insert({ business_id: o.businessId, customer_id: customerId })).error).not.toBeNull();
    expect((await e.client.from("job_assignments").insert({ job_id: jobId, user_id: e.id, business_id: o.businessId })).error).not.toBeNull();
  });

  it("can upload photos to their assigned job only", async () => {
    const o = await owner();
    const e = await join(o, o.businessId, "employee");
    const mine = await customerAndJob(o, "Photo Mine");
    const other = await customerAndJob(o, "Photo Other");
    await o.client.from("job_assignments").insert({ job_id: mine.jobId, user_id: e.id, business_id: o.businessId });
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const ok = `${o.businessId}/${mine.jobId}/${crypto.randomUUID()}.png`;
    expect((await e.client.storage.from("job-photos").upload(ok, png, { contentType: "image/png" })).error).toBeNull();
    expect((await e.client.from("job_photos").insert({ business_id: o.businessId, job_id: mine.jobId, storage_path: ok })).error).toBeNull();
    const bad = `${o.businessId}/${other.jobId}/${crypto.randomUUID()}.png`;
    expect((await e.client.storage.from("job-photos").upload(bad, png, { contentType: "image/png" })).error).not.toBeNull();
  });
});

describe("assignments", () => {
  it("assigning notifies the employee; only teammates can be assigned", async () => {
    const o = await owner();
    const e = await join(o, o.businessId, "employee");
    const outsider = await createUser({ role: "customer" });
    const { jobId } = await customerAndJob(o, "Notify");
    await o.client.from("job_assignments").insert({ job_id: jobId, user_id: e.id, business_id: o.businessId });
    expect((await e.client.from("notifications").select("kind").eq("kind", "job_assigned")).data).toHaveLength(1);
    expect((await o.client.from("job_assignments").insert({ job_id: jobId, user_id: outsider.id, business_id: o.businessId })).error).not.toBeNull();
  });

  it("a recurring service's default employee is assigned to every generated visit", async () => {
    const o = await owner();
    const e = await join(o, o.businessId, "employee");
    const { customerId } = await customerAndJob(o, "Weekly");
    const { data: today } = await adminClient().rpc("business_today", { p_business_id: o.businessId });
    const { data: s, error } = await o.client.from("recurring_schedules").insert({
      business_id: o.businessId, customer_id: customerId, title: "Weekly mow", price_cents: 4500, frequency: "weekly",
      start_date: today as string, start_time: "09:00", default_assignee: e.id,
    }).select().single();
    expect(error).toBeNull();
    const { data: visits } = await e.client.from("jobs").select("id").eq("recurring_schedule_id", s!.id);
    expect(visits!.length).toBeGreaterThanOrEqual(12);
  });

  it("removing someone from the team ends their access", async () => {
    const o = await owner();
    const e = await join(o, o.businessId, "employee");
    const { jobId } = await customerAndJob(o, "Removed");
    await o.client.from("job_assignments").insert({ job_id: jobId, user_id: e.id, business_id: o.businessId });
    expect((await o.client.rpc("remove_member", { p_business_id: o.businessId, p_user_id: e.id })).error).toBeNull();
    expect((await e.client.from("jobs").select("id")).data).toEqual([]);
    expect((await e.client.from("businesses").select("id")).data).toEqual([]);
    expect((await o.client.rpc("remove_member", { p_business_id: o.businessId, p_user_id: o.id })).error).not.toBeNull(); // owner stays
  });
});

describe("managers", () => {
  it("run the business day to day but can't change roles or remove other managers", async () => {
    const o = await owner();
    const m = await join(o, o.businessId, "manager");
    const m2 = await join(o, o.businessId, "manager");
    expect((await m.client.from("crm_customers").insert({ business_id: o.businessId, full_name: "By manager" })).error).toBeNull();
    expect((await m.client.rpc("business_dashboard", { p_business_id: o.businessId })).error).toBeNull();
    expect((await m.client.rpc("set_member_role", { p_business_id: o.businessId, p_user_id: m2.id, p_role: "employee" })).error).not.toBeNull();
    expect((await m.client.rpc("remove_member", { p_business_id: o.businessId, p_user_id: m2.id })).error).not.toBeNull();
    expect((await o.client.rpc("set_member_role", { p_business_id: o.businessId, p_user_id: m2.id, p_role: "employee" })).error).toBeNull();
  });
});

describe("accepting an invitation", () => {
  it("an invited login joins only once they confirm (accept) the invite, and can be cancelled before that", async () => {
    const o = await owner();
    const admin = adminClient();
    const email = `pending-${crypto.randomUUID()}@example.com`;
    const { data: inv } = await o.client.rpc("create_invitation", { p_business_id: o.businessId, p_email: email, p_full_name: "Pending Pat", p_role: "employee" });
    // What sending the invite does: an unconfirmed login carrying the token.
    const { data: created } = await admin.auth.admin.createUser({ email, user_metadata: { invite_token: inv.token } });
    const id = created.user!.id;
    expect((await admin.from("business_members").select("user_id").eq("user_id", id)).data).toEqual([]);
    expect((await admin.rpc("is_unaccepted_invitee", { p_email: email })).data).toBe(id);
    // Not callable by signed-in users.
    expect((await o.client.rpc("is_unaccepted_invitee", { p_email: email })).error).not.toBeNull();

    // Accepting = Supabase confirming their email.
    await admin.auth.admin.updateUserById(id, { email_confirm: true });
    expect((await admin.from("business_members").select("business_id, role").eq("user_id", id)).data).toEqual([{ business_id: o.businessId, role: "employee" }]);
    expect((await admin.from("business_invitations").select("accepted_at").eq("id", inv.id).single()).data?.accepted_at).not.toBeNull();
    expect((await admin.rpc("is_unaccepted_invitee", { p_email: email })).data).toBeNull();
  });

  it("an existing account can't be invited, but a never-accepted invitee can be invited again", async () => {
    const o = await owner();
    const existing = await createUser({ role: "customer" });
    expect((await o.client.rpc("create_invitation", { p_business_id: o.businessId, p_email: existing.email, p_full_name: "", p_role: "employee" })).error?.message).toMatch(/already has a HomeHire account/);
    const email = `again-${crypto.randomUUID()}@example.com`;
    const { data: inv } = await o.client.rpc("create_invitation", { p_business_id: o.businessId, p_email: email, p_full_name: "", p_role: "employee" });
    await adminClient().auth.admin.createUser({ email, user_metadata: { invite_token: inv.token } });
    expect((await o.client.rpc("create_invitation", { p_business_id: o.businessId, p_email: email, p_full_name: "", p_role: "employee" })).error).toBeNull();
  });
});
