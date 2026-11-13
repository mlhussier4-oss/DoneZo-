import type { Instrumentation } from "next";

/**
 * Runs once when the server starts. A production server refuses to start with missing or unsafe
 * settings, so a mistake shows up immediately instead of as broken pages or payments.
 */
export function register() {
  if (process.env.NODE_ENV !== "production" || process.env.NEXT_RUNTIME !== "nodejs") return;
  const required = ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`HomeHire cannot start: missing settings ${missing.join(", ")}. See docs/DEPLOYMENT.md.`);
  const site = process.env.NEXT_PUBLIC_SITE_URL!;
  const local = /^http:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(site);
  if (!local && !site.startsWith("https://")) throw new Error("HomeHire cannot start: NEXT_PUBLIC_SITE_URL must start with https:// on a public server.");
  if (!local && process.env.STRIPE_API_HOST) throw new Error("HomeHire cannot start: STRIPE_API_HOST (the test simulator) must not be set on a public server.");
  if (process.env.STRIPE_SECRET_KEY!.startsWith("sk_live_") && process.env.STRIPE_ALLOW_LIVE !== "true") {
    throw new Error("HomeHire cannot start: a live Stripe key is set but live payments have not been approved (STRIPE_ALLOW_LIVE).");
  }
}

/**
 * Every server error is written to the server log as one line of JSON with the same code ("digest")
 * the user sees, so support can find it. Hosting providers collect these logs automatically.
 * Request bodies, cookies and headers are never logged.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err as Error & { digest?: string };
  console.error(JSON.stringify({
    level: "error",
    at: new Date().toISOString(),
    digest: e.digest,
    message: e.message,
    path: request.path.split("?")[0],
    method: request.method,
    route: context.routePath,
    kind: context.routeType,
  }));
};
