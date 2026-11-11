import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

/** Signing secret the e2e tests use to sign fake Stripe webhook events (test-only, not a real secret). */
export const E2E_WEBHOOK_SECRET = "whsec_e2e_local_test_only";

/**
 * End-to-end tests: real browser, real website, real local database and test inbox.
 * Run `npm run build` first; the tests start the production server themselves.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "off",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grepInvert: /@mobile/ },
    { name: "phone", use: { ...devices["iPhone 13"], browserName: "chromium" }, grep: /@mobile/ },
  ],
  webServer: [
    {
      // Stripe's official local simulator (see README). Tests never touch real Stripe.
      command: "npm run stripe:mock",
      url: "http://127.0.0.1:12111/v1/customers",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run start -- -H 127.0.0.1 -p 3000",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        STRIPE_SECRET_KEY: "sk_test_123", // stripe-mock accepts any test-looking key
        STRIPE_API_HOST: "127.0.0.1",
        STRIPE_API_PORT: "12111",
        STRIPE_API_PROTOCOL: "http",
        STRIPE_WEBHOOK_SECRET: E2E_WEBHOOK_SECRET,
      },
    },
  ],
});
