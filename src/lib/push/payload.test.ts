import { createECDH, randomBytes } from "node:crypto";
import webpush from "web-push";
import { describe, expect, it } from "vitest";
import { pushPayload } from "./payload";

describe("push payload", () => {
  it("keeps links on HomeHire, groups messages per conversation, and flags time-critical alerts", () => {
    const base = { id: "n1", title: "New bid from Alpha", body: "$80", link: "/customer" };
    expect(pushPayload({ ...base, kind: "new_bid" })).toEqual({ title: "New bid from Alpha", body: "$80", url: "/customer", tag: "new_bid:n1", urgent: false });
    expect(pushPayload({ ...base, kind: "message", link: "/customer/requests/r1" }).tag).toBe("message:/customer/requests/r1");
    expect(pushPayload({ ...base, kind: "booking_pending" }).urgent).toBe(true);
    expect(pushPayload({ ...base, kind: "new_bid", link: "//evil.example" }).url).toBe("/");
    expect(pushPayload({ ...base, kind: "new_bid", link: null, body: null })).toMatchObject({ url: "/", body: "" });
  });

  it("encrypts a payload for a browser with our VAPID keys (no network)", () => {
    const vapid = webpush.generateVAPIDKeys();
    // A browser's key pair, as Chrome or Safari would create it.
    const browser = createECDH("prime256v1");
    browser.generateKeys();
    const p256dh = browser.getPublicKey().toString("base64url");
    const auth = randomBytes(16).toString("base64url");
    const details = webpush.generateRequestDetails(
      { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh, auth } },
      JSON.stringify(pushPayload({ id: "n1", kind: "new_bid", title: "t", body: "b", link: "/customer" })),
      { vapidDetails: { subject: "mailto:support@homehire.us", publicKey: vapid.publicKey, privateKey: vapid.privateKey }, TTL: 60 },
    );
    expect(details.method).toBe("POST");
    expect(details.headers.Authorization).toMatch(/^vapid t=/);
    expect(details.headers["Content-Encoding"]).toBe("aes128gcm");
  });
});
