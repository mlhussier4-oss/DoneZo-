/**
 * Phase 3 marketplace rules, tested as real signed-in users against the local database.
 */
import { describe, expect, it } from "vitest";
import { adminClient, anonClient, businessIdFor, createUser, type TestUser } from "./helpers";

type Provider = TestUser & { businessId: string };

let categoryCache: Record<string, string> | null = null;
async function categoryId(slug: string) {
  if (!categoryCache) {
    const { data } = await anonClient().from("service_categories").select("id, slug");
    categoryCache = Object.fromEntries(data!.map((c) => [c.slug, c.id]));
  }
  return categoryCache[slug];
}

/** A marketplace provider based in a ZIP, serving a radius, offering some categories. */
async function provider(opts: { zip?: string; radius?: number; categories?: string[]; marketplace?: boolean; name?: string } = {}): Promise<Provider> {
  const user = await createUser({
    role: "provider",
    business_name: `${opts.name ?? "Pro"} ${Date.now()}`,
    marketplace_enabled: opts.marketplace ?? true,
  });
  const businessId = await businessIdFor(user.id);
  await user.client.from("businesses").update({ home_zip: opts.zip ?? "78704", service_radius_miles: opts.radius ?? 15 }).eq("id", businessId);
  for (const slug of opts.categories ?? ["lawn-mowing"]) {
    await user.client.from("provider_categories").insert({ business_id: businessId, category_id: await categoryId(slug) });
  }
  return { ...user, businessId };
}

async function postJob(customer: TestUser, opts: { zip?: string; category?: string } = {}) {
  const { data, error } = await customer.client
    .from("service_requests")
    .insert({ category_id: await categoryId(opts.category ?? "lawn-mowing"), description: "Front and back yard, about a quarter acre", timing: "this_week", zip: opts.zip ?? "78745" })
    .select()
    .single();
  if (error) throw error;
  const loc = await customer.client
    .from("service_request_locations")
    .insert({ request_id: data.id, line1: "1100 Secret Lane", city: "Austin", state: "TX", phone: "512-555-0199" });
  if (loc.error) throw loc.error;
  return data;
}

async function bid(p: Provider, requestId: string, priceCents = 6000) {
  const { data, error } = await p.client
    .from("bids")
    .insert({ request_id: requestId, business_id: p.businessId, price_cents: priceCents, included: "Mow, edge, blow clippings", availability: "Thursday morning" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function feedIds(p: Provider) {
  const { data, error } = await p.client.rpc("marketplace_feed");
  if (error) throw error;
  return (data ?? []).map((r: { id: string }) => r.id);
}

const customer = () => createUser({ role: "customer", full_name: "Casey Homeowner" });

describe("posting a job", () => {
  it("a customer posts a job in Austin with no card and it starts open for 7 days", async () => {
    const c = await customer();
    const r = await postJob(c);
    expect(r.status).toBe("open");
    const days = (new Date(r.expires_at).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });

  it("a ZIP outside the service area is turned away with a clear message", async () => {
    const c = await customer();
    const { error } = await c.client
      .from("service_requests")
      .insert({ category_id: await categoryId("lawn-mowing"), description: "x", timing: "asap", zip: "75201" });
    expect(error?.message).toMatch(/Austin/);
  });

  it("provider accounts cannot post jobs, and customers cannot fake status or expiry", async () => {
    const p = await provider();
    const { error } = await p.client
      .from("service_requests")
      .insert({ category_id: await categoryId("lawn-mowing"), description: "x", timing: "asap", zip: "78745" });
    expect(error).not.toBeNull();

    const c = await customer();
    const fake = await c.client
      .from("service_requests")
      .insert({ category_id: await categoryId("lawn-mowing"), description: "x", timing: "asap", zip: "78745", status: "booked" });
    expect(fake.error).not.toBeNull();
  });

  it("a customer cannot see other customers' jobs", async () => {
    const a = await customer();
    const b = await customer();
    const r = await postJob(a);
    expect((await b.client.from("service_requests").select("id").eq("id", r.id)).data).toEqual([]);
    expect((await b.client.from("service_request_locations").select("line1").eq("request_id", r.id)).data).toEqual([]);
  });
});

describe("who sees a job", () => {
  it("only nearby marketplace providers offering the service see it, without the customer's identity or address", async () => {
    const near = await provider({ zip: "78704", radius: 15 });
    const far = await provider({ zip: "78660", radius: 5 }); // Pflugerville, small radius
    const otherService = await provider({ zip: "78704", categories: ["house-cleaning"] });
    const crmOnly = await provider({ zip: "78704", marketplace: false });
    const c = await customer();
    const r = await postJob(c);

    expect(await feedIds(near)).toContain(r.id);
    expect(await feedIds(far)).not.toContain(r.id);
    expect(await feedIds(otherService)).not.toContain(r.id);
    expect(await feedIds(crmOnly)).not.toContain(r.id);

    const { data: feed } = await near.client.rpc("marketplace_feed");
    const row = feed!.find((x: { id: string }) => x.id === r.id)!;
    expect(row.zip).toBe("78745");
    expect(JSON.stringify(row)).not.toContain("Secret Lane");
    expect(JSON.stringify(row)).not.toContain(c.id);
    expect(JSON.stringify(row)).not.toContain("512-555-0199");

    // Direct table access is blocked for providers.
    expect((await near.client.from("service_requests").select("id").eq("id", r.id)).data).toEqual([]);
    expect((await near.client.from("service_request_locations").select("line1").eq("request_id", r.id)).data).toEqual([]);
  });

  it("only matching providers are notified about a new job", async () => {
    const near = await provider({ zip: "78704" });
    const crmOnly = await provider({ zip: "78704", marketplace: false });
    const c = await customer();
    const r = await postJob(c);
    const link = `/provider/marketplace/requests/${r.id}`;
    expect((await near.client.from("notifications").select("link").eq("link", link)).data).toHaveLength(1);
    expect((await crmOnly.client.from("notifications").select("link").eq("link", link)).data).toHaveLength(0);
  });

  it("a CRM-only provider cannot bid even with the job's id", async () => {
    const crmOnly = await provider({ marketplace: false });
    const r = await postJob(await customer());
    await expect(bid(crmOnly, r.id)).rejects.toBeTruthy();
  });

  it("an eligible provider can view the job's photos; others cannot", async () => {
    const near = await provider({ zip: "78704" });
    const far = await provider({ zip: "78660", radius: 5 });
    const c = await customer();
    const r = await postJob(c);
    const path = `${c.id}/${r.id}/${crypto.randomUUID()}.png`;
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    expect((await c.client.storage.from("request-photos").upload(path, png, { contentType: "image/png" })).error).toBeNull();
    expect((await c.client.from("request_photos").insert({ request_id: r.id, storage_path: path })).error).toBeNull();

    expect((await near.client.storage.from("request-photos").createSignedUrl(path, 60)).error).toBeNull();
    expect((await far.client.storage.from("request-photos").createSignedUrl(path, 60)).error).not.toBeNull();
  });
});

describe("sealed bids", () => {
  it("providers never see each other's bids; the customer sees all of them with provider cards", async () => {
    const a = await provider({ name: "Alpha" });
    const b = await provider({ name: "Bravo" });
    const c = await customer();
    const r = await postJob(c);
    const bidA = await bid(a, r.id, 6000);
    await bid(b, r.id, 5500);

    expect((await b.client.from("bids").select("id").eq("id", bidA.id)).data).toEqual([]);
    expect((await b.client.from("bids").select("price_cents").eq("request_id", r.id)).data).toEqual([{ price_cents: 5500 }]);

    const { data: bids } = await c.client.rpc("request_bids", { p_request_id: r.id });
    expect(bids.map((x: { price_cents: number }) => x.price_cents)).toEqual([5500, 6000]);
    expect(bids[0].business.stats).toEqual({ rating: null, review_count: 0, completed_jobs: 0 });

    // Another customer can't read them.
    const other = await customer();
    expect((await other.client.rpc("request_bids", { p_request_id: r.id })).data).toEqual([]);
  });

  it("one bid per provider per job; a provider can edit or withdraw its own bid while the job is open", async () => {
    const p = await provider();
    const r = await postJob(await customer());
    const first = await bid(p, r.id, 6000);
    await expect(bid(p, r.id, 5000)).rejects.toBeTruthy();
    expect((await p.client.from("bids").update({ price_cents: 5800 }).eq("id", first.id)).error).toBeNull();
    expect((await p.client.from("bids").update({ status: "accepted" }).eq("id", first.id)).error).not.toBeNull();
    expect((await p.client.from("bids").update({ status: "withdrawn" }).eq("id", first.id)).error).toBeNull();
  });
});

describe("accepting a bid", () => {
  it("creates the booking, locks the price, closes other bids and adds the customer to the winner's CRM only", async () => {
    const winner = await provider({ name: "Winner" });
    const loser = await provider({ name: "Loser" });
    const c = await customer();
    const r = await postJob(c);
    const winning = await bid(winner, r.id, 6500);
    const losing = await bid(loser, r.id, 7000);

    // Someone else can't accept on the customer's behalf.
    expect((await loser.client.rpc("accept_bid", { p_bid_id: losing.id })).error).not.toBeNull();

    const { data: booking, error } = await c.client.rpc("accept_bid", { p_bid_id: winning.id });
    expect(error).toBeNull();
    expect(booking.agreed_price_cents).toBe(6500);
    expect(booking.scope).toContain("Mow, edge, blow clippings");

    expect((await c.client.from("service_requests").select("status").eq("id", r.id).single()).data?.status).toBe("booked");
    expect((await loser.client.from("bids").select("status").eq("id", losing.id).single()).data?.status).toBe("closed");
    expect((await c.client.rpc("accept_bid", { p_bid_id: losing.id })).error).not.toBeNull();

    // Winner's CRM now has the customer, address, phone and a marketplace job at the agreed price.
    const { data: crm } = await winner.client
      .from("crm_customers")
      .select("full_name, phone, source, crm_customer_addresses(line1, postal_code), jobs(price_cents, source, status)")
      .eq("profile_id", c.id)
      .single();
    expect(crm?.full_name).toBe("Casey Homeowner");
    expect(crm?.phone).toBe("512-555-0199");
    expect(crm?.source).toBe("marketplace");
    expect(crm?.crm_customer_addresses).toEqual([{ line1: "1100 Secret Lane", postal_code: "78745" }]);
    expect(crm?.jobs).toEqual([{ price_cents: 6500, source: "marketplace", status: "new" }]);

    // The losing provider learns nothing about the customer.
    expect((await loser.client.from("crm_customers").select("id").eq("profile_id", c.id)).data).toEqual([]);
    expect((await loser.client.from("bookings").select("id").eq("id", booking.id)).data).toEqual([]);
  });

  it("no new bids once a job is booked", async () => {
    const a = await provider();
    const late = await provider();
    const c = await customer();
    const r = await postJob(c);
    await c.client.rpc("accept_bid", { p_bid_id: (await bid(a, r.id)).id });
    await expect(bid(late, r.id)).rejects.toBeTruthy();
    expect(await feedIds(late)).not.toContain(r.id);
  });

  it("canceling an open request closes its bids", async () => {
    const p = await provider();
    const c = await customer();
    const r = await postJob(c);
    const b = await bid(p, r.id);
    expect((await c.client.rpc("cancel_request", { p_request_id: r.id })).error).toBeNull();
    expect((await p.client.from("bids").select("status").eq("id", b.id).single()).data?.status).toBe("closed");
  });
});

describe("messaging", () => {
  it("exists only after acceptance, and only between the customer and the chosen provider", async () => {
    const winner = await provider();
    const loser = await provider();
    const c = await customer();
    const r = await postJob(c);
    const winning = await bid(winner, r.id);
    await bid(loser, r.id);

    // Before acceptance there is no booking to message on.
    expect((await c.client.from("bookings").select("id").eq("request_id", r.id)).data).toEqual([]);

    const { data: booking } = await c.client.rpc("accept_bid", { p_bid_id: winning.id });
    expect((await c.client.from("messages").insert({ booking_id: booking.id, body: "Gate code is 1234" })).error).toBeNull();
    expect((await winner.client.from("messages").insert({ booking_id: booking.id, body: "Thanks, see you Thursday" })).error).toBeNull();
    expect((await loser.client.from("messages").insert({ booking_id: booking.id, body: "Pick me instead" })).error).not.toBeNull();
    expect((await loser.client.from("messages").select("id").eq("booking_id", booking.id)).data).toEqual([]);

    // Nobody can send as someone else.
    expect((await c.client.from("messages").insert({ booking_id: booking.id, body: "x", sender_id: winner.id })).error).not.toBeNull();

    const { data: thread } = await winner.client.from("messages").select("body").eq("booking_id", booking.id).order("created_at");
    expect(thread?.map((m) => m.body)).toEqual(["Gate code is 1234", "Thanks, see you Thursday"]);
  });
});

describe("the agreed price only changes with the customer's approval", () => {
  async function booked() {
    const p = await provider();
    const c = await customer();
    const r = await postJob(c);
    const { data: booking } = await c.client.rpc("accept_bid", { p_bid_id: (await bid(p, r.id, 6000)).id });
    return { p, c, r, booking };
  }

  it("a provider cannot edit the job price or the invoice lines directly", async () => {
    const { p, booking } = await booked();
    expect((await p.client.from("jobs").update({ price_cents: 9000 }).eq("id", booking.job_id)).error?.message).toMatch(/change order/);
    const { data: inv } = await p.client.rpc("create_invoice_for_job", { p_job_id: booking.job_id });
    expect(inv.total_cents).toBe(6000);
    const add = await p.client.from("invoice_line_items").insert({ business_id: p.businessId, invoice_id: inv.id, description: "Extra", quantity: 1, unit_price_cents: 5000 });
    expect(add.error).not.toBeNull();
    const replace = await p.client.rpc("replace_document_lines", { p_kind: "invoice", p_document_id: inv.id, p_lines: [{ position: 0, description: "x", quantity: 1, unit_price_cents: 99999 }] });
    expect(replace.error).not.toBeNull();
    // Tax can't be added on top of the agreed price either.
    await p.client.from("invoices").update({ tax_rate_bps: 825 }).eq("id", inv.id);
    expect((await p.client.from("invoices").select("total_cents").eq("id", inv.id).single()).data?.total_cents).toBe(6000);
  });

  it("an approved change order updates the booking, the job and the unpaid invoice", async () => {
    const { p, c, booking } = await booked();
    const { data: inv } = await p.client.rpc("create_invoice_for_job", { p_job_id: booking.job_id });
    const { data: co, error } = await p.client
      .from("change_orders")
      .insert({ booking_id: booking.id, new_price_cents: 7500, description: "Also trim the hedges" })
      .select()
      .single();
    expect(error).toBeNull();

    // Only the customer decides.
    expect((await p.client.rpc("decide_change_order", { p_change_order_id: co!.id, p_approve: true })).error).not.toBeNull();
    expect((await c.client.rpc("decide_change_order", { p_change_order_id: co!.id, p_approve: true })).error).toBeNull();

    expect((await p.client.from("bookings").select("agreed_price_cents, original_price_cents").eq("id", booking.id).single()).data)
      .toEqual({ agreed_price_cents: 7500, original_price_cents: 6000 });
    expect((await p.client.from("jobs").select("price_cents").eq("id", booking.job_id).single()).data?.price_cents).toBe(7500);
    expect((await p.client.from("invoices").select("total_cents").eq("id", inv.id).single()).data?.total_cents).toBe(7500);
  });

  it("a declined change order leaves the price as agreed", async () => {
    const { p, c, booking } = await booked();
    const { data: co } = await p.client.from("change_orders").insert({ booking_id: booking.id, new_price_cents: 9000, description: "More work" }).select().single();
    await c.client.rpc("decide_change_order", { p_change_order_id: co!.id, p_approve: false });
    expect((await c.client.from("bookings").select("agreed_price_cents").eq("id", booking.id).single()).data?.agreed_price_cents).toBe(6000);
  });

  it("a customer cannot propose a change order", async () => {
    const { c, booking } = await booked();
    // Customers are participants but not business members; the insert trigger refuses.
    expect((await c.client.from("change_orders").insert({ booking_id: booking.id, new_price_cents: 100, description: "cheaper" })).error).not.toBeNull();
  });
});

describe("reviews", () => {
  it("only the customer can review, only once, and only after the job is completed", async () => {
    const p = await provider();
    const c = await customer();
    const r = await postJob(c);
    const { data: booking } = await c.client.rpc("accept_bid", { p_bid_id: (await bid(p, r.id)).id });

    expect((await c.client.from("reviews").insert({ booking_id: booking.id, rating: 5 })).error).not.toBeNull();

    await p.client.from("jobs").update({ status: "completed" }).eq("id", booking.job_id);
    expect((await c.client.from("bookings").select("status").eq("id", booking.id).single()).data?.status).toBe("completed");

    expect((await p.client.from("reviews").insert({ booking_id: booking.id, rating: 5 })).error).not.toBeNull(); // provider can't self-review
    expect((await c.client.from("reviews").insert({ booking_id: booking.id, rating: 5, comment: "Great job" })).error).toBeNull();
    expect((await c.client.from("reviews").insert({ booking_id: booking.id, rating: 1 })).error).not.toBeNull(); // only once

    const { data: profile } = await anonClient().rpc("get_provider_profile", { p_business_id: p.businessId });
    expect(profile.stats).toEqual({ rating: 5, review_count: 1, completed_jobs: 1 });
    expect(profile.reviews[0]).toMatchObject({ rating: 5, comment: "Great job", author: "Casey" });
  });
});

describe("public provider profiles", () => {
  it("are visible for marketplace providers and hidden for CRM-only businesses", async () => {
    const mkt = await provider();
    const crmOnly = await provider({ marketplace: false });
    expect((await anonClient().rpc("get_provider_profile", { p_business_id: mkt.businessId })).data?.id).toBe(mkt.businessId);
    expect((await anonClient().rpc("get_provider_profile", { p_business_id: crmOnly.businessId })).data).toBeNull();
  });

  it("verification can only be granted by an admin", async () => {
    const p = await provider();
    expect((await p.client.from("businesses").update({ verified_at: new Date().toISOString() }).eq("id", p.businessId)).error).not.toBeNull();
    expect((await p.client.rpc("admin_set_business_verified", { p_business_id: p.businessId, p_verified: true, p_note: "" })).error).not.toBeNull();
    const { data } = await adminClient().from("businesses").select("verified_at").eq("id", p.businessId).single();
    expect(data?.verified_at).toBeNull();
  });
});
