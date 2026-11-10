/**
 * Phase 2 (CRM) database tests: run as real signed-in users, so Row Level
 * Security and every database rule apply exactly as they do on the website.
 */
import { describe, expect, it } from "vitest";
import { adminClient, anonClient, businessIdFor, createUser, type TestUser } from "./helpers";

type Provider = TestUser & { businessId: string };

async function provider(name = "Test Co"): Promise<Provider> {
  const user = await createUser({ role: "provider", business_name: `${name} ${Date.now()}`, marketplace_enabled: false });
  return { ...user, businessId: await businessIdFor(user.id) };
}

async function addCustomer(p: Provider, fullName = "Outside Customer") {
  const { data, error } = await p.client
    .from("crm_customers")
    .insert({ business_id: p.businessId, full_name: fullName, phone: "555-0100" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function addJob(p: Provider, customerId: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await p.client
    .from("jobs")
    .insert({ business_id: p.businessId, customer_id: customerId, title: "Mow lawn", price_cents: 4500, ...extra })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function addInvoice(p: Provider, customerId: string, lines: { qty: number; price: number; taxable?: boolean }[], taxBps = 0) {
  const { data: inv, error } = await p.client
    .from("invoices")
    .insert({ business_id: p.businessId, customer_id: customerId, tax_rate_bps: taxBps })
    .select()
    .single();
  if (error) throw error;
  const { error: lineError } = await p.client.from("invoice_line_items").insert(
    lines.map((l, i) => ({
      business_id: p.businessId,
      invoice_id: inv.id,
      position: i,
      description: `Line ${i + 1}`,
      quantity: l.qty,
      unit_price_cents: l.price,
      taxable: l.taxable ?? true,
    })),
  );
  if (lineError) throw lineError;
  const { data } = await p.client.from("invoices").select("*").eq("id", inv.id).single();
  return data!;
}

async function invoice(p: Provider, id: string) {
  const { data } = await p.client.from("invoices").select("*").eq("id", id).single();
  return data!;
}

/** Today's date in the business timezone (America/New_York by default). */
async function today(p: Provider): Promise<string> {
  const { data } = await adminClient().rpc("business_today", { p_business_id: p.businessId });
  return data as string;
}

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

describe("CRM-only provider manages outside customers", () => {
  it("adds a customer with an address and notes", async () => {
    const p = await provider("Outside Co");
    const customer = await addCustomer(p, "Dana Smith");
    expect(customer.source).toBe("direct");

    const { error: addrError } = await p.client.from("crm_customer_addresses").insert({
      business_id: p.businessId,
      customer_id: customer.id,
      line1: "12 Oak St",
      city: "Springfield",
      state: "IL",
      postal_code: "62701",
      is_primary: true,
    });
    expect(addrError).toBeNull();

    const { error: noteError } = await p.client
      .from("crm_customer_notes")
      .insert({ business_id: p.businessId, customer_id: customer.id, body: "Gate code 1234" });
    expect(noteError).toBeNull();

    const { data } = await p.client
      .from("crm_customers")
      .select("full_name, crm_customer_addresses(line1), crm_customer_notes(body, author_id)")
      .eq("id", customer.id)
      .single();
    expect(data?.crm_customer_addresses).toEqual([{ line1: "12 Oak St" }]);
    expect(data?.crm_customer_notes).toEqual([{ body: "Gate code 1234", author_id: p.id }]);
  });

  it("cannot mark a customer as a marketplace customer or link it to someone's account", async () => {
    const p = await provider();
    const victim = await createUser({ role: "customer" });
    const { error } = await p.client
      .from("crm_customers")
      .insert({ business_id: p.businessId, full_name: "X", source: "marketplace", profile_id: victim.id });
    expect(error).not.toBeNull();
  });

  it("can search customers by name", async () => {
    const p = await provider();
    await addCustomer(p, "Zelda Fitzgerald");
    await addCustomer(p, "Ernest Hemingway");
    const { data } = await p.client.from("crm_customers").select("full_name").ilike("full_name", "%zel%");
    expect(data).toEqual([{ full_name: "Zelda Fitzgerald" }]);
  });
});

describe("businesses cannot see or touch each other's CRM data", () => {
  it("provider B sees none of provider A's customers, jobs, invoices, payments or notes", async () => {
    const a = await provider("A");
    const b = await provider("B");
    const customer = await addCustomer(a);
    await a.client.from("crm_customer_notes").insert({ business_id: a.businessId, customer_id: customer.id, body: "secret" });
    const job = await addJob(a, customer.id);
    const inv = await addInvoice(a, customer.id, [{ qty: 1, price: 1000 }]);
    await a.client.rpc("send_invoice", { p_invoice_id: inv.id });
    await a.client.from("payment_records").insert({
      business_id: a.businessId, customer_id: customer.id, invoice_id: inv.id, amount_cents: 500, method: "cash",
    });

    for (const table of ["crm_customers", "crm_customer_notes", "jobs", "invoices", "invoice_line_items", "payment_records", "job_status_history"]) {
      const { data } = await b.client.from(table).select("*").eq("business_id", a.businessId);
      expect(data, table).toEqual([]);
    }
    expect((await b.client.from("jobs").select("id").eq("id", job.id)).data).toEqual([]);
  });

  it("provider B cannot attach a job, invoice or payment to provider A's customer", async () => {
    const a = await provider("A");
    const b = await provider("B");
    const customer = await addCustomer(a);

    // Pretending to be A's business: blocked by RLS.
    const asA = await b.client.from("jobs").insert({ business_id: a.businessId, customer_id: customer.id, title: "x" });
    expect(asA.error).not.toBeNull();
    // Using B's own business id with A's customer: blocked by the foreign key.
    const asB = await b.client.from("jobs").insert({ business_id: b.businessId, customer_id: customer.id, title: "x" });
    expect(asB.error).not.toBeNull();
    const inv = await b.client.from("invoices").insert({ business_id: b.businessId, customer_id: customer.id });
    expect(inv.error).not.toBeNull();
    const pay = await b.client
      .from("payment_records")
      .insert({ business_id: b.businessId, customer_id: customer.id, amount_cents: 100, method: "cash" });
    expect(pay.error).not.toBeNull();
  });

  it("provider B cannot edit or delete provider A's records", async () => {
    const a = await provider("A");
    const b = await provider("B");
    const customer = await addCustomer(a, "Original");
    await b.client.from("crm_customers").update({ full_name: "Hacked" }).eq("id", customer.id);
    await b.client.from("crm_customers").delete().eq("id", customer.id);
    const { data } = await adminClient().from("crm_customers").select("full_name").eq("id", customer.id).single();
    expect(data?.full_name).toBe("Original");
  });

  it("a job's address must belong to the same customer", async () => {
    const p = await provider();
    const c1 = await addCustomer(p, "One");
    const c2 = await addCustomer(p, "Two");
    const { data: addr } = await p.client
      .from("crm_customer_addresses")
      .insert({ business_id: p.businessId, customer_id: c2.id, line1: "1 Main", city: "X", state: "TX", postal_code: "75001" })
      .select()
      .single();
    const { error } = await p.client
      .from("jobs")
      .insert({ business_id: p.businessId, customer_id: c1.id, address_id: addr!.id, title: "Wrong address" });
    expect(error).not.toBeNull();
  });

  it("a customer (homeowner) account sees no CRM data at all", async () => {
    const a = await provider();
    await addCustomer(a);
    const homeowner = await createUser({ role: "customer" });
    for (const table of ["crm_customers", "jobs", "invoices", "payment_records", "recurring_schedules"]) {
      expect((await homeowner.client.from(table).select("id")).data, table).toEqual([]);
    }
  });
});

describe("jobs", () => {
  it("records status changes with timestamps", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    const job = await addJob(p, c.id, { status: "scheduled" });
    await p.client.from("jobs").update({ status: "in_progress" }).eq("id", job.id);
    await p.client.from("jobs").update({ status: "completed" }).eq("id", job.id);
    const { data: updated } = await p.client.from("jobs").select("started_at, completed_at").eq("id", job.id).single();
    expect(updated?.started_at).not.toBeNull();
    expect(updated?.completed_at).not.toBeNull();
    const { data: history } = await p.client
      .from("job_status_history")
      .select("from_status, to_status, changed_by")
      .eq("job_id", job.id)
      .order("id");
    expect(history?.map((h) => [h.from_status, h.to_status])).toEqual([
      [null, "scheduled"],
      ["scheduled", "in_progress"],
      ["in_progress", "completed"],
    ]);
    expect(history?.every((h) => h.changed_by === p.id)).toBe(true);
  });

  it("cannot be created as a marketplace job by a provider (only the marketplace can do that)", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    const { error } = await p.client
      .from("jobs")
      .insert({ business_id: p.businessId, customer_id: c.id, title: "x", source: "marketplace" });
    expect(error).not.toBeNull();
  });
});

describe("recurring services", () => {
  async function weeklySchedule(p: Provider, customerId: string, startDate: string, extra: Record<string, unknown> = {}) {
    const { data, error } = await p.client
      .from("recurring_schedules")
      .insert({
        business_id: p.businessId,
        customer_id: customerId,
        title: "Weekly mow",
        price_cents: 4500,
        frequency: "weekly",
        start_date: startDate,
        start_time: "09:00",
        duration_minutes: 45,
        ...extra,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function visits(p: Provider, scheduleId: string) {
    const { data } = await p.client
      .from("jobs")
      .select("id, occurrence_date, scheduled_start, scheduled_end, price_cents, status, is_detached")
      .eq("recurring_schedule_id", scheduleId)
      .order("occurrence_date");
    return data!;
  }

  it("a weekly schedule creates about 13 weeks of visits on the same weekday at the right local time", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    const start = await today(p);
    const s = await weeklySchedule(p, c.id, start);
    const v = await visits(p, s.id);
    expect(v.length).toBeGreaterThanOrEqual(13);
    expect(v.length).toBeLessThanOrEqual(14);
    const weekdays = new Set(v.map((x) => new Date(`${x.occurrence_date}T00:00:00Z`).getUTCDay()));
    expect(weekdays.size).toBe(1);
    // 9:00 in New York is 13:00 or 14:00 UTC depending on daylight saving time.
    for (const x of v) {
      const local = new Date(x.scheduled_start).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });
      expect(local).toBe("09:00");
      expect(new Date(x.scheduled_end).getTime() - new Date(x.scheduled_start).getTime()).toBe(45 * 60 * 1000);
    }
    expect(v.every((x) => x.status === "scheduled" && x.price_cents === 4500)).toBe(true);
  });

  it("does not create visits in the past", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    const t = await today(p);
    const s = await weeklySchedule(p, c.id, addDays(t, -28));
    const v = await visits(p, s.id);
    expect(v.every((x) => x.occurrence_date >= t)).toBe(true);
  });

  it("monthly on the 31st falls back to the last day of shorter months", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    const t = await today(p);
    // Find the next 31st on or after today.
    const d = new Date(`${t}T00:00:00Z`);
    while (d.getUTCDate() !== 31) d.setUTCDate(d.getUTCDate() + 1);
    const s = await weeklySchedule(p, c.id, d.toISOString().slice(0, 10), { frequency: "monthly", end_date: addDays(t, 200) });
    const { data } = await adminClient().rpc("generate_recurring_jobs", { p_schedule_id: s.id, p_through: addDays(t, 200) });
    expect(typeof data).toBe("number");
    const v = await visits(p, s.id);
    for (const x of v) {
      const day = new Date(`${x.occurrence_date}T00:00:00Z`);
      const lastOfMonth = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)).getUTCDate();
      expect(day.getUTCDate()).toBe(Math.min(31, lastOfMonth));
    }
  });

  it("editing the price changes future untouched visits only, never completed or hand-edited ones", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    const s = await weeklySchedule(p, c.id, await today(p));
    const before = await visits(p, s.id);

    // Visit 1 completed, visit 2 rescheduled by hand.
    await p.client.from("jobs").update({ status: "completed" }).eq("id", before[0].id);
    const moved = new Date(new Date(before[1].scheduled_start).getTime() + 3600_000).toISOString();
    await p.client.from("jobs").update({ scheduled_start: moved, scheduled_end: moved }).eq("id", before[1].id);

    const { error } = await p.client.from("recurring_schedules").update({ price_cents: 5000 }).eq("id", s.id);
    expect(error).toBeNull();

    const after = await visits(p, s.id);
    const byDate = new Map(after.map((x) => [x.occurrence_date, x]));
    expect(byDate.get(before[0].occurrence_date)?.price_cents).toBe(4500); // completed: unchanged
    expect(byDate.get(before[0].occurrence_date)?.status).toBe("completed");
    expect(byDate.get(before[1].occurrence_date)?.price_cents).toBe(4500); // hand-edited: unchanged
    expect(byDate.get(before[1].occurrence_date)?.is_detached).toBe(true);
    for (const x of after.slice(2)) expect(x.price_cents).toBe(5000);
    expect(after.length).toBe(before.length);
  });

  it("pausing removes future untouched visits; resuming brings them back; history stays", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    const s = await weeklySchedule(p, c.id, await today(p));
    const before = await visits(p, s.id);
    await p.client.from("jobs").update({ status: "completed" }).eq("id", before[0].id);

    await p.client.from("recurring_schedules").update({ status: "paused" }).eq("id", s.id);
    const paused = await visits(p, s.id);
    expect(paused.map((x) => x.status)).toEqual(["completed"]);

    await p.client.from("recurring_schedules").update({ status: "active" }).eq("id", s.id);
    const resumed = await visits(p, s.id);
    expect(resumed.length).toBe(before.length);
    expect(resumed[0].status).toBe("completed");
  });

  it("a single canceled visit is not recreated when the schedule is regenerated", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    const s = await weeklySchedule(p, c.id, await today(p));
    const v = await visits(p, s.id);
    await p.client.from("jobs").update({ status: "canceled" }).eq("id", v[2].id);
    await p.client.from("recurring_schedules").update({ title: "Weekly mow + edging" }).eq("id", s.id);
    const after = await visits(p, s.id);
    expect(after.filter((x) => x.occurrence_date === v[2].occurrence_date).map((x) => x.status)).toEqual(["canceled"]);
  });

  it("the nightly job keeps schedules filled ahead", async () => {
    const { data, error } = await adminClient().rpc("extend_recurring_jobs");
    expect(error).toBeNull();
    expect(typeof data).toBe("number");
  });
});

describe("invoices", () => {
  it("the database calculates subtotal, tax and total", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    // 2 × $45.00 taxable + 1 × $10.00 not taxable, 8.25% tax on $90.00 = $7.43 (rounded)
    const inv = await addInvoice(p, c.id, [{ qty: 2, price: 4500 }, { qty: 1, price: 1000, taxable: false }], 825);
    expect(inv.subtotal_cents).toBe(10000);
    expect(inv.tax_cents).toBe(743);
    expect(inv.total_cents).toBe(10743);
    expect(inv.status).toBe("draft");
  });

  it("totals and status cannot be set by hand", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    const inv = await addInvoice(p, c.id, [{ qty: 1, price: 5000 }]);
    for (const patch of [{ total_cents: 1 }, { status: "paid" }, { amount_paid_cents: 5000 }, { number: 999 }]) {
      const { error } = await p.client.from("invoices").update(patch).eq("id", inv.id);
      expect(error, JSON.stringify(patch)).not.toBeNull();
    }
  });

  it("invoice numbers count up per business, starting at 1", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    const first = await addInvoice(p, c.id, [{ qty: 1, price: 100 }]);
    const second = await addInvoice(p, c.id, [{ qty: 1, price: 100 }]);
    expect([first.number, second.number]).toEqual([1, 2]);
  });

  it("recording cash then Venmo moves the invoice from sent to partially paid to paid", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    const inv = await addInvoice(p, c.id, [{ qty: 1, price: 10000 }]);

    const early = await p.client.from("payment_records").insert({
      business_id: p.businessId, customer_id: c.id, invoice_id: inv.id, amount_cents: 100, method: "cash",
    });
    expect(early.error).not.toBeNull(); // drafts can't take payments

    await p.client.rpc("send_invoice", { p_invoice_id: inv.id });
    expect((await invoice(p, inv.id)).status).toBe("sent");

    await p.client.from("payment_records").insert({
      business_id: p.businessId, customer_id: c.id, invoice_id: inv.id, amount_cents: 4000, method: "cash",
    });
    let now = await invoice(p, inv.id);
    expect([now.status, now.amount_paid_cents]).toEqual(["partially_paid", 4000]);

    await p.client.from("payment_records").insert({
      business_id: p.businessId, customer_id: c.id, invoice_id: inv.id, amount_cents: 6000, method: "venmo",
    });
    now = await invoice(p, inv.id);
    expect([now.status, now.amount_paid_cents]).toEqual(["paid", 10000]);
    expect(now.paid_at).not.toBeNull();

    // A paid invoice's line items are locked.
    const edit = await p.client.from("invoice_line_items").insert({
      business_id: p.businessId, invoice_id: inv.id, description: "extra", quantity: 1, unit_price_cents: 100,
    });
    expect(edit.error).not.toBeNull();

    // Deleting a mistaken record re-opens the balance.
    const { data: recs } = await p.client.from("payment_records").select("id").eq("invoice_id", inv.id).eq("method", "venmo");
    await p.client.from("payment_records").delete().eq("id", recs![0].id);
    now = await invoice(p, inv.id);
    expect([now.status, now.amount_paid_cents]).toEqual(["partially_paid", 4000]);
  });

  it("providers can never record a card payment or mark a payment as Stripe-verified", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    const card = await p.client
      .from("payment_records")
      .insert({ business_id: p.businessId, customer_id: c.id, amount_cents: 100, method: "card" });
    expect(card.error).not.toBeNull();
    const verified = await p.client.from("payment_records").insert({
      business_id: p.businessId, customer_id: c.id, amount_cents: 100, method: "cash", verification: "stripe_verified",
    });
    expect(verified.error).not.toBeNull();
    const ok = await p.client
      .from("payment_records")
      .insert({ business_id: p.businessId, customer_id: c.id, amount_cents: 100, method: "cash_app" })
      .select("verification")
      .single();
    expect(ok.data?.verification).toBe("provider_recorded");
  });

  it("only drafts can be deleted; sent invoices are voided instead", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    const draft = await addInvoice(p, c.id, [{ qty: 1, price: 100 }]);
    await p.client.from("invoices").delete().eq("id", draft.id);
    expect((await p.client.from("invoices").select("id").eq("id", draft.id)).data).toEqual([]);

    const sent = await addInvoice(p, c.id, [{ qty: 1, price: 100 }]);
    await p.client.rpc("send_invoice", { p_invoice_id: sent.id });
    await p.client.from("invoices").delete().eq("id", sent.id);
    expect((await p.client.from("invoices").select("id").eq("id", sent.id)).data).toHaveLength(1);

    const { data: voided, error } = await p.client.rpc("void_invoice", { p_invoice_id: sent.id });
    expect(error).toBeNull();
    expect(voided.status).toBe("void");
  });

  it("an invoice created from a job carries the job's price and stays a direct (non-marketplace) invoice", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    const job = await addJob(p, c.id, { price_cents: 7500 });
    const { data: inv, error } = await p.client.rpc("create_invoice_for_job", { p_job_id: job.id });
    expect(error).toBeNull();
    expect(inv.total_cents).toBe(7500);
    expect(inv.source).toBe("direct");
    expect(inv.job_id).toBe(job.id);
  });

  it("another provider cannot send, void or invoice someone else's documents", async () => {
    const a = await provider("A");
    const b = await provider("B");
    const c = await addCustomer(a);
    const inv = await addInvoice(a, c.id, [{ qty: 1, price: 100 }]);
    const job = await addJob(a, c.id);
    expect((await b.client.rpc("send_invoice", { p_invoice_id: inv.id })).error).not.toBeNull();
    expect((await b.client.rpc("void_invoice", { p_invoice_id: inv.id })).error).not.toBeNull();
    expect((await b.client.rpc("create_invoice_for_job", { p_job_id: job.id })).error).not.toBeNull();
    expect((await b.client.rpc("business_dashboard", { p_business_id: a.businessId })).error).not.toBeNull();
  });
});

describe("customer-facing invoice link", () => {
  it("works without logging in once sent, and never shows drafts", async () => {
    const p = await provider();
    const c = await addCustomer(p, "Link Customer");
    const inv = await addInvoice(p, c.id, [{ qty: 1, price: 2500 }]);
    const anon = anonClient();

    expect((await anon.rpc("get_public_invoice", { p_token: inv.public_token })).data).toBeNull();
    await p.client.rpc("send_invoice", { p_invoice_id: inv.id });
    const { data } = await anon.rpc("get_public_invoice", { p_token: inv.public_token });
    expect(data.total_cents).toBe(2500);
    expect(data.customer_name).toBe("Link Customer");
    expect(data.line_items).toHaveLength(1);
    expect(data).not.toHaveProperty("customer_id");

    expect((await anon.rpc("get_public_invoice", { p_token: "0".repeat(48) })).data).toBeNull();
  });

  it("the public cannot read invoice tables directly", async () => {
    const { error } = await anonClient().from("invoices").select("id");
    expect(error).not.toBeNull();
  });
});

describe("estimates", () => {
  it("an accepted estimate becomes an invoice with the same lines", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    const { data: est } = await p.client
      .from("estimates")
      .insert({ business_id: p.businessId, customer_id: c.id, tax_rate_bps: 500 })
      .select()
      .single();
    await p.client.from("estimate_line_items").insert([
      { business_id: p.businessId, estimate_id: est!.id, position: 0, description: "Haul away couch", quantity: 1, unit_price_cents: 12000 },
      { business_id: p.businessId, estimate_id: est!.id, position: 1, description: "Disposal fee", quantity: 2, unit_price_cents: 1500 },
    ]);
    await p.client.rpc("set_estimate_status", { p_estimate_id: est!.id, p_status: "sent" });
    await p.client.rpc("set_estimate_status", { p_estimate_id: est!.id, p_status: "accepted" });

    const { data: inv, error } = await p.client.rpc("convert_estimate_to_invoice", { p_estimate_id: est!.id });
    expect(error).toBeNull();
    expect(inv.subtotal_cents).toBe(15000);
    expect(inv.tax_cents).toBe(750);
    expect(inv.total_cents).toBe(15750);
    expect(inv.estimate_id).toBe(est!.id);

    const { data: after } = await p.client.from("estimates").select("status").eq("id", est!.id).single();
    expect(after?.status).toBe("converted");
    expect((await p.client.rpc("convert_estimate_to_invoice", { p_estimate_id: est!.id })).error).not.toBeNull();
  });
});

describe("dashboard figures", () => {
  it("reflect real payments, jobs and customers", async () => {
    const p = await provider();
    const c = await addCustomer(p);
    const job1 = await addJob(p, c.id, { price_cents: 5000 });
    const job2 = await addJob(p, c.id, { price_cents: 7000 });
    await p.client.from("jobs").update({ status: "completed" }).in("id", [job1.id, job2.id]);
    const inv = await addInvoice(p, c.id, [{ qty: 1, price: 12000 }]);
    await p.client.rpc("send_invoice", { p_invoice_id: inv.id });
    await p.client.from("payment_records").insert({
      business_id: p.businessId, customer_id: c.id, invoice_id: inv.id, amount_cents: 2000, method: "cash",
      received_on: await today(p),
    });

    const { data, error } = await p.client.rpc("business_dashboard", { p_business_id: p.businessId });
    expect(error).toBeNull();
    expect(data.revenue_month_cents).toBe(2000);
    expect(data.revenue_week_cents).toBe(2000);
    expect(data.completed_jobs_month).toBe(2);
    expect(data.new_customers_month).toBe(1);
    expect(data.repeat_customers).toBe(1);
    expect(data.outstanding_invoices).toBe(1);
    expect(data.outstanding_cents).toBe(10000);
    expect(data.average_job_cents).toBe(6000);
    expect(data.revenue_by_month).toHaveLength(6);
  });
});

describe("job photos storage", () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);

  it("a provider can upload to its own job folder but not into another business's folder", async () => {
    const a = await provider("A");
    const b = await provider("B");
    const ca = await addCustomer(a);
    const job = await addJob(a, ca.id);
    const ownPath = `${a.businessId}/${job.id}/${crypto.randomUUID()}.png`;
    const own = await a.client.storage.from("job-photos").upload(ownPath, png, { contentType: "image/png" });
    expect(own.error).toBeNull();
    const row = await a.client.from("job_photos").insert({ business_id: a.businessId, job_id: job.id, storage_path: ownPath });
    expect(row.error).toBeNull();

    const intrude = await b.client.storage
      .from("job-photos")
      .upload(`${a.businessId}/${job.id}/${crypto.randomUUID()}.png`, png, { contentType: "image/png" });
    expect(intrude.error).not.toBeNull();

    const read = await b.client.storage.from("job-photos").download(ownPath);
    expect(read.error).not.toBeNull();
    const signed = await b.client.storage.from("job-photos").createSignedUrl(ownPath, 60);
    expect(signed.error).not.toBeNull();
  });
});
