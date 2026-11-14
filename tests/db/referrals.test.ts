/**
 * Provider referrals (owner decision 2026-11-14): 2 paying referrals = 1 free month of the referrer's plan.
 */
import { describe, expect, it } from "vitest";
import { adminClient, anonClient, businessIdFor, createUser, type TestUser } from "./helpers";

type Pro = TestUser & { businessId: string; code: string };

async function pro(name: string, referralCode?: string): Promise<Pro> {
  const u = await createUser({ role: "provider", business_name: `${name} ${Date.now()}`, ...(referralCode ? { referral_code: referralCode } : {}) });
  const businessId = await businessIdFor(u.id);
  const { data } = await u.client.from("businesses").select("referral_code").eq("id", businessId).single();
  return { ...u, businessId, code: data!.referral_code };
}
/** The reward a payment created, or null (an empty row comes back as all nulls). */
const pay = async (businessId: string) => {
  const r = await adminClient().rpc("record_referral_payment", { p_business_id: businessId });
  return { ...r, data: r.data && (r.data as { id: string | null }).id ? r.data : null };
};

describe("provider referrals", () => {
  it("each business gets its own code, and signing up with it records who referred them", async () => {
    const a = await pro("Referrer");
    expect(a.code).toMatch(/^[A-Z2-9]{7}$/);
    const b = await pro("Invited", a.code.toLowerCase()); // case doesn't matter
    const { data } = await adminClient().from("businesses").select("referred_by").eq("id", b.businessId).single();
    expect(data!.referred_by).toBe(a.businessId);
    const bogus = await pro("Nobody sent me", "ZZZZZZZ9");
    expect((await adminClient().from("businesses").select("referred_by").eq("id", bogus.businessId).single()).data!.referred_by).toBeNull();
    // Providers can't change who referred them, or credit themselves.
    expect((await b.client.from("businesses").update({ referred_by: null } as never).eq("id", b.businessId)).error).not.toBeNull();
    expect((await anonClient().rpc("referrer_name", { p_code: a.code })).data).toMatch(/^Referrer/);
  });

  it("2 paying referrals = 1 free month of the referrer's plan; 4 = 2; refunds before use don't count", async () => {
    const a = await pro("Earner");
    const [r1, r2, r3, r4, r5] = await Promise.all(["One", "Two", "Three", "Four", "Five"].map((n) => pro(n, a.code)));
    // Only the server (after a verified Stripe payment) can record payments.
    expect((await a.client.rpc("record_referral_payment", { p_business_id: r1.businessId })).error).not.toBeNull();

    expect((await pay(r1.businessId)).data).toBeNull(); // 1 paying: nothing yet
    expect((await pay(r1.businessId)).data).toBeNull(); // the same business paying again doesn't count twice
    const { data: first } = await pay(r2.businessId);
    expect(first).toMatchObject({ business_id: a.businessId, amount_cents: 1999, status: "pending" }); // Pro by default

    await pay(r3.businessId);
    await adminClient().rpc("revoke_referral_payment", { p_business_id: r3.businessId }); // refunded before use
    expect((await pay(r4.businessId)).data).toBeNull(); // r3 no longer counts
    expect((await pay(r5.businessId)).data).toMatchObject({ business_id: a.businessId });

    const { data: rewards } = await a.client.from("referral_rewards").select("id").eq("business_id", a.businessId);
    expect(rewards).toHaveLength(2);
    const { data: mine } = await a.client.rpc("my_referrals");
    expect(mine).toHaveLength(5);
    expect(mine!.filter((m: { paying: boolean }) => m.paying)).toHaveLength(4);
    const { data: notif } = await a.client.from("notifications").select("kind").eq("kind", "referral_reward");
    expect(notif!.length).toBeGreaterThanOrEqual(2);
  });

  it("nobody else can see your referrals or rewards", async () => {
    const a = await pro("Private");
    const b = await pro("Ref", a.code);
    await pay(b.businessId);
    const other = await pro("Snoop");
    expect((await other.client.rpc("my_referrals")).data).toEqual([]);
    expect((await other.client.from("referrals").select("*").eq("referrer_business_id", a.businessId)).data).toEqual([]);
    expect((await b.client.rpc("my_referrals")).data).toEqual([]); // the referred business doesn't see the referrer's list
  });
});
