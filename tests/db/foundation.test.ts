/**
 * Phase 1 database security tests.
 * These run against the local Supabase database and log in as real users,
 * so Row Level Security is enforced exactly as it would be for a browser.
 */
import { describe, expect, it } from "vitest";
import { adminClient, anonClient, businessIdFor, createAdmin, createUser } from "./helpers";

describe("sign-up creates the right kind of account", () => {
  it("customer sign-up creates a customer profile and no business", async () => {
    const customer = await createUser({ role: "customer", full_name: "Casey Customer" });
    const { data: profile } = await customer.client.from("profiles").select("*").single();
    expect(profile?.role).toBe("customer");
    expect(profile?.full_name).toBe("Casey Customer");

    const { data: businesses } = await customer.client.from("businesses").select("id");
    expect(businesses).toEqual([]);
  });

  it("CRM-only provider gets a business with the marketplace switched off", async () => {
    const provider = await createUser({
      role: "provider",
      full_name: "Pat Provider",
      business_name: "Pat's Lawn Care",
      marketplace_enabled: false,
    });
    const { data: profile } = await provider.client.from("profiles").select("role").single();
    expect(profile?.role).toBe("provider");

    const { data: business } = await provider.client.from("businesses").select("*").single();
    expect(business?.name).toBe("Pat's Lawn Care");
    expect(business?.marketplace_enabled).toBe(false);
    expect(business?.marketplace_enabled_at).toBeNull();

    const { data: members } = await provider.client.from("business_members").select("role, user_id");
    expect(members).toEqual([{ role: "owner", user_id: provider.id }]);
  });

  it("CRM + Marketplace provider gets the same kind of business with the switch on", async () => {
    const provider = await createUser({
      role: "provider",
      business_name: "Shine Pressure Washing",
      marketplace_enabled: true,
    });
    const { data: business } = await provider.client.from("businesses").select("*").single();
    expect(business?.marketplace_enabled).toBe(true);
    expect(business?.marketplace_enabled_at).not.toBeNull();
  });

  it("every new business is placed on the default plan (Pro) with entitlements", async () => {
    const provider = await createUser({ role: "provider", business_name: "Plan Check" });
    const businessId = await businessIdFor(provider.id);
    const { data, error } = await provider.client.rpc("business_entitlements", { p_business_id: businessId });
    expect(error).toBeNull();
    expect(data.crm_customers).toEqual({ enabled: true, limit: null });
    expect(data.crm).toEqual({ enabled: true, limit: null });
    expect(data.marketplace).toEqual({ enabled: true, limit: null }); // both plans include the marketplace
  });

  it("cannot sign up as an admin by tampering with sign-up data", async () => {
    const attacker = await createUser({ role: "admin" });
    const { data: profile } = await attacker.client.from("profiles").select("role").single();
    expect(profile?.role).toBe("customer");
  });
});

describe("users cannot change their own role or suspension", () => {
  it("a customer cannot promote themselves to admin", async () => {
    const customer = await createUser({ role: "customer" });
    const { error } = await customer.client.from("profiles").update({ role: "admin" }).eq("id", customer.id);
    expect(error).not.toBeNull();
    const { data } = await adminClient().from("profiles").select("role").eq("id", customer.id).single();
    expect(data?.role).toBe("customer");
  });

  it("a user can update their own name and phone", async () => {
    const customer = await createUser({ role: "customer" });
    const { error } = await customer.client
      .from("profiles")
      .update({ full_name: "New Name", phone: "555-0100" })
      .eq("id", customer.id);
    expect(error).toBeNull();
    const { data } = await customer.client.from("profiles").select("full_name, phone").single();
    expect(data).toEqual({ full_name: "New Name", phone: "555-0100" });
  });

  it("a user cannot unsuspend themselves", async () => {
    const customer = await createUser({ role: "customer" });
    const { error } = await customer.client.from("profiles").update({ is_suspended: false }).eq("id", customer.id);
    expect(error).not.toBeNull();
  });
});

describe("providers are isolated from each other", () => {
  it("provider A cannot see provider B's business or members", async () => {
    const a = await createUser({ role: "provider", business_name: "A Co" });
    const b = await createUser({ role: "provider", business_name: "B Co" });
    const bBusinessId = await businessIdFor(b.id);

    const { data: seen } = await a.client.from("businesses").select("id, name");
    expect(seen?.map((x) => x.name)).toEqual(["A Co"]);

    const { data: bDirect } = await a.client.from("businesses").select("id").eq("id", bBusinessId);
    expect(bDirect).toEqual([]);

    const { data: bMembers } = await a.client.from("business_members").select("*").eq("business_id", bBusinessId);
    expect(bMembers).toEqual([]);
  });

  it("provider A cannot rename provider B's business", async () => {
    const a = await createUser({ role: "provider", business_name: "A Co" });
    const b = await createUser({ role: "provider", business_name: "B Co" });
    const bBusinessId = await businessIdFor(b.id);

    await a.client.from("businesses").update({ name: "Hacked" }).eq("id", bBusinessId);
    const { data } = await adminClient().from("businesses").select("name").eq("id", bBusinessId).single();
    expect(data?.name).toBe("B Co");
  });

  it("provider A cannot switch on provider B's marketplace access", async () => {
    const a = await createUser({ role: "provider", business_name: "A Co" });
    const b = await createUser({ role: "provider", business_name: "B Co" });
    const bBusinessId = await businessIdFor(b.id);

    const { error } = await a.client.rpc("set_marketplace_enabled", { p_business_id: bBusinessId, p_enabled: true });
    expect(error).not.toBeNull();
    const { data } = await adminClient().from("businesses").select("marketplace_enabled").eq("id", bBusinessId).single();
    expect(data?.marketplace_enabled).toBe(false);
  });

  it("provider A cannot read provider B's entitlements", async () => {
    const a = await createUser({ role: "provider", business_name: "A Co" });
    const b = await createUser({ role: "provider", business_name: "B Co" });
    const { data } = await a.client.rpc("business_entitlements", { p_business_id: await businessIdFor(b.id) });
    expect(data).toEqual({});
  });
});

describe("marketplace access can be turned on later without a new account", () => {
  it("a CRM-only owner enables the marketplace on the same business", async () => {
    const provider = await createUser({ role: "provider", business_name: "Later Co", marketplace_enabled: false });
    const businessId = await businessIdFor(provider.id);

    const { data, error } = await provider.client.rpc("set_marketplace_enabled", {
      p_business_id: businessId,
      p_enabled: true,
    });
    expect(error).toBeNull();
    expect(data.id).toBe(businessId); // same business, nothing migrated
    expect(data.marketplace_enabled).toBe(true);
    expect(data.marketplace_enabled_at).not.toBeNull();

    const { data: off } = await provider.client.rpc("set_marketplace_enabled", {
      p_business_id: businessId,
      p_enabled: false,
    });
    expect(off.marketplace_enabled).toBe(false);
  });

  it("the marketplace switch cannot be flipped by a direct table update", async () => {
    const provider = await createUser({ role: "provider", business_name: "Direct Co" });
    const businessId = await businessIdFor(provider.id);
    const { error } = await provider.client
      .from("businesses")
      .update({ marketplace_enabled: true })
      .eq("id", businessId);
    expect(error).not.toBeNull();
  });

  it("a provider cannot move their business to a different plan", async () => {
    const provider = await createUser({ role: "provider", business_name: "Plan Co" });
    const businessId = await businessIdFor(provider.id);
    const { error } = await provider.client
      .from("businesses")
      .update({ plan_id: "00000000-0000-0000-0000-000000000000" })
      .eq("id", businessId);
    expect(error).not.toBeNull();
  });
});

describe("customers cannot see provider data", () => {
  it("a customer sees no businesses, members or audit log", async () => {
    await createUser({ role: "provider", business_name: "Hidden Co" });
    const customer = await createUser({ role: "customer" });
    expect((await customer.client.from("businesses").select("id")).data).toEqual([]);
    expect((await customer.client.from("business_members").select("user_id")).data).toEqual([]);
    expect((await customer.client.from("admin_audit_log").select("id")).data).toEqual([]);
  });

  it("a customer cannot read other people's profiles", async () => {
    const other = await createUser({ role: "customer", full_name: "Other Person" });
    const customer = await createUser({ role: "customer" });
    const { data } = await customer.client.from("profiles").select("id").eq("id", other.id);
    expect(data).toEqual([]);
  });
});

describe("the public (not logged in)", () => {
  it("can read active service categories, including the launch categories and car detailing", async () => {
    const { data, error } = await anonClient().from("service_categories").select("slug").order("sort_order");
    expect(error).toBeNull();
    const slugs = data!.map((c) => c.slug);
    for (const slug of ["junk-removal", "lawn-mowing", "pet-waste-pickup", "pressure-washing", "house-cleaning", "car-detailing", "moving", "misc"]) {
      expect(slugs).toContain(slug);
    }
    expect(slugs).not.toContain("turf-installation"); // removed as a service (owner request 2026-11-12)
  });

  it("cannot read profiles, businesses or the audit log", async () => {
    const anon = anonClient();
    expect((await anon.from("profiles").select("id")).error).not.toBeNull();
    expect((await anon.from("businesses").select("id")).error).not.toBeNull();
    expect((await anon.from("admin_audit_log").select("id")).error).not.toBeNull();
  });
});

describe("administrators have separate permissions", () => {
  it("an admin can see all profiles and businesses", async () => {
    const name = `Seen By Admin ${Date.now()}`;
    const provider = await createUser({ role: "provider", business_name: name });
    const admin = await createAdmin();
    const { data: profiles } = await admin.client.from("profiles").select("id").eq("id", provider.id);
    expect(profiles).toHaveLength(1);
    const { data: businesses } = await admin.client.from("businesses").select("name").eq("name", name);
    expect(businesses).toHaveLength(1);
  });

  it("an admin can create a service category and it is written to the audit log", async () => {
    const admin = await createAdmin();
    const slug = `e2e-test-cat-${Date.now()}`;
    const { data: cat, error } = await admin.client.rpc("admin_upsert_service_category", {
      p_id: null,
      p_slug: slug,
      p_name: "Test category",
      p_description: null,
      p_icon: "wrench",
      p_sort_order: 99,
      p_is_active: false,
    });
    expect(error).toBeNull();
    expect(cat.slug).toBe(slug);

    const { data: log } = await admin.client
      .from("admin_audit_log")
      .select("action, actor_id, target_id")
      .eq("target_id", cat.id);
    expect(log).toEqual([{ action: "service_category.create", actor_id: admin.id, target_id: cat.id }]);

    // Inactive categories are hidden from the public.
    const { data: publicView } = await anonClient().from("service_categories").select("id").eq("id", cat.id);
    expect(publicView).toEqual([]);

    await adminClient().from("service_categories").delete().eq("id", cat.id);
  });

  it("providers and customers cannot use admin functions", async () => {
    const provider = await createUser({ role: "provider", business_name: "Not Admin" });
    const customer = await createUser({ role: "customer" });
    for (const user of [provider, customer]) {
      const { error } = await user.client.rpc("admin_upsert_service_category", {
        p_id: null,
        p_slug: `nope-${Date.now()}`,
        p_name: "Nope",
        p_description: null,
        p_icon: "wrench",
        p_sort_order: 0,
        p_is_active: true,
      });
      expect(error).not.toBeNull();
      const { error: suspendError } = await user.client.rpc("admin_set_user_suspended", {
        p_user_id: provider.id,
        p_suspended: true,
        p_reason: "test",
      });
      expect(suspendError).not.toBeNull();
    }
  });

  it("an admin can suspend a user, with an audit log entry", async () => {
    const admin = await createAdmin();
    const target = await createUser({ role: "customer" });
    const { data, error } = await admin.client.rpc("admin_set_user_suspended", {
      p_user_id: target.id,
      p_suspended: true,
      p_reason: "Test suspension",
    });
    expect(error).toBeNull();
    expect(data.is_suspended).toBe(true);
    const { data: log } = await admin.client
      .from("admin_audit_log")
      .select("action")
      .eq("target_id", target.id);
    expect(log).toEqual([{ action: "user.suspend" }]);
  });

  it("nobody can write to the audit log directly, not even an admin", async () => {
    const admin = await createAdmin();
    const { error } = await admin.client
      .from("admin_audit_log")
      .insert({ action: "fake", target_type: "x" });
    expect(error).not.toBeNull();
  });
});
