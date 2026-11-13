/**
 * Push notifications (owner request 2026-11-13): who can register a device, and that a new notification makes the
 * database call the website's /api/push with the shared secret (a real pg_net request to a test server).
 */
import { createServer, type IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, anonClient, createUser } from "./helpers";

const db = new Client({ connectionString: process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
const endpoint = () => `https://push.example.test/${randomUUID()}`;
const keys = { p_p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXy7tzyr8vjEiZZb8x9a1k3D1c7yE7Wb5U", p_auth: "tBHItJI5svbpez7KI4CCXg" };

beforeAll(async () => { await db.connect(); });
afterAll(async () => { await db.end(); });

describe("push subscriptions", () => {
  it("each person registers and sees only their own devices; guests can't register while signed out", async () => {
    const a = await createUser({ role: "customer", full_name: "Push A" });
    const b = await createUser({ role: "customer", full_name: "Push B" });
    const e = endpoint();
    expect((await a.client.rpc("register_push_subscription", { p_endpoint: e, ...keys, p_user_agent: "test" })).error).toBeNull();
    expect((await a.client.from("push_subscriptions").select("endpoint")).data).toEqual([{ endpoint: e }]);
    expect((await b.client.from("push_subscriptions").select("endpoint")).data).toEqual([]);
    expect((await anonClient().rpc("register_push_subscription", { p_endpoint: endpoint(), ...keys, p_user_agent: "x" })).error).not.toBeNull();
    // Can't write a row for someone else directly.
    expect((await b.client.from("push_subscriptions").insert({ user_id: a.id, endpoint: endpoint(), p256dh: "x", auth: "y" })).error).not.toBeNull();
    // The same browser signing in as someone else moves to that person.
    expect((await b.client.rpc("register_push_subscription", { p_endpoint: e, ...keys, p_user_agent: "test" })).error).toBeNull();
    expect((await a.client.from("push_subscriptions").select("endpoint")).data).toEqual([]);
    expect((await b.client.from("push_subscriptions").select("endpoint")).data).toEqual([{ endpoint: e }]);
  });
});

describe("a new notification asks the website to send the push", () => {
  it("calls /api/push with the secret and the notification id, only for people with a device registered", async () => {
    const received: { secret?: string; body: string }[] = [];
    const server = createServer((req: IncomingMessage, res) => {
      let body = "";
      req.on("data", (c) => { body += c; });
      req.on("end", () => { received.push({ secret: req.headers["x-push-secret"] as string, body }); res.end("{}"); });
    });
    await new Promise<void>((r) => server.listen(0, "0.0.0.0", () => r()));
    const port = (server.address() as { port: number }).port;
    // The database reaches this machine at the address it sees our own connection come from.
    const host = (await db.query("select host(inet_client_addr()) as h")).rows[0].h as string;
    const secret = `test-${randomUUID()}`;
    await db.query("delete from vault.secrets where name in ('push_webhook_url', 'push_webhook_secret')");
    await db.query("select vault.create_secret($1, 'push_webhook_url'), vault.create_secret($2, 'push_webhook_secret')", [`http://${host}:${port}/api/push`, secret]);
    try {
      const withDevice = await createUser({ role: "customer", full_name: "Has Phone" });
      const noDevice = await createUser({ role: "customer", full_name: "No Phone" });
      await withDevice.client.rpc("register_push_subscription", { p_endpoint: endpoint(), ...keys, p_user_agent: "test" });
      const admin = adminClient();
      const { data: n1 } = await admin.from("notifications").insert({ user_id: withDevice.id, kind: "new_bid", title: "New bid", body: "x", link: "/customer" }).select("id").single();
      await admin.from("notifications").insert({ user_id: noDevice.id, kind: "new_bid", title: "New bid", body: "x", link: "/customer" });
      for (let i = 0; i < 50 && received.length < 1; i++) await new Promise((r) => setTimeout(r, 200));
      await new Promise((r) => setTimeout(r, 500));
      expect(received).toHaveLength(1);
      expect(received[0].secret).toBe(secret);
      expect(JSON.parse(received[0].body)).toEqual({ notification_id: n1!.id });
    } finally {
      await db.query("delete from vault.secrets where name in ('push_webhook_url', 'push_webhook_secret')");
      server.close();
    }
  });
});
