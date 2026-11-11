import "server-only";
import { HttpsProxyAgent } from "https-proxy-agent";
import Stripe from "stripe";

/**
 * Stripe client (server only).
 *
 * Safety (Blueprint rule 19): DoneZo refuses to use a live key, or act on live-mode objects,
 * unless STRIPE_ALLOW_LIVE=true has been set deliberately with the owner's approval.
 *
 * In this project's cloud sessions the real test key is injected by a network proxy, so
 * STRIPE_SECRET_KEY can be a placeholder like "sk_test_proxy_injected". For automated tests,
 * STRIPE_API_HOST/PORT/PROTOCOL point the client at Stripe's local simulator (stripe-mock).
 */
let client: Stripe | null = null;

export const liveModeAllowed = () => process.env.STRIPE_ALLOW_LIVE === "true";

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY is missing). See .env.example.");
  if (key.startsWith("sk_live_") && !liveModeAllowed()) {
    throw new Error("Refusing to use a live Stripe key. Live payments need the owner's explicit approval (STRIPE_ALLOW_LIVE=true).");
  }
  // Stripe's library doesn't read HTTPS_PROXY itself; use it when the environment provides one
  // (e.g. sandboxed development). Normal hosting has no proxy and connects directly.
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  client = new Stripe(key, {
    maxNetworkRetries: 2,
    appInfo: { name: "DoneZo" },
    ...(proxy && !process.env.STRIPE_API_HOST ? { httpAgent: new HttpsProxyAgent(proxy) } : {}),
    ...(process.env.STRIPE_API_HOST
      ? {
          host: process.env.STRIPE_API_HOST,
          port: process.env.STRIPE_API_PORT ?? "443",
          protocol: (process.env.STRIPE_API_PROTOCOL as "http" | "https") ?? "https",
        }
      : {}),
  });
  return client;
}

/** Throws if Stripe returned a live-mode object while live mode isn't approved. */
export function assertTestMode(obj: { livemode?: boolean | null }) {
  if (obj.livemode && !liveModeAllowed()) {
    throw new Error("Stripe returned a live-mode object, but live payments are not approved for DoneZo.");
  }
}
