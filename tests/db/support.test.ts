/** Phase 6: support requests. */
import { describe, expect, it } from "vitest";
import { createAdmin, createUser } from "./helpers";

describe("support requests", () => {
  it("anyone signed in can ask; only they and admins can read it; the admin reply notifies them", async () => {
    const provider = await createUser({ role: "provider", business_name: "Help Co" });
    const other = await createUser({ role: "customer" });
    const admin = await createAdmin();
    // Sending in someone else's name is refused outright.
    expect((await provider.client.from("support_reports").insert({ category: "other", message: "Pretending to be someone", reporter_id: other.id } as never)).error).not.toBeNull();
    const { data: sent, error } = await provider.client.from("support_reports")
      .insert({ category: "question", subject: "How do payouts work?", message: "When does card money arrive?" })
      .select("id, reporter_id, status").single();
    expect(error).toBeNull();
    expect(sent).toMatchObject({ reporter_id: provider.id, status: "open" });

    expect((await other.client.from("support_reports").select("id").eq("id", sent!.id)).data).toEqual([]);
    expect((await other.client.rpc("admin_resolve_report", { p_report_id: sent!.id, p_note: "x" })).error).not.toBeNull();

    expect((await admin.client.rpc("admin_resolve_report", { p_report_id: sent!.id, p_note: "Usually 2 business days." })).error).toBeNull();
    const { data: mine } = await provider.client.from("support_reports").select("status, admin_note").eq("id", sent!.id).single();
    expect(mine).toEqual({ status: "resolved", admin_note: "Usually 2 business days." });
    const { data: notes } = await provider.client.from("notifications").select("kind, link").eq("kind", "support_reply");
    expect(notes).toEqual([{ kind: "support_reply", link: "/help" }]);
  });

  it("limits a person to 10 requests a day and refuses signed-out visitors", async () => {
    const c = await createUser({ role: "customer" });
    for (let i = 0; i < 10; i++) {
      expect((await c.client.from("support_reports").insert({ category: "other", message: `Message number ${i}` })).error).toBeNull();
    }
    expect((await c.client.from("support_reports").insert({ category: "other", message: "One too many" })).error?.message).toMatch(/a lot of requests today/);
    const { anonClient } = await import("./helpers");
    expect((await anonClient().from("support_reports").insert({ category: "other", message: "Anonymous spam" })).error).not.toBeNull();
  });
});
