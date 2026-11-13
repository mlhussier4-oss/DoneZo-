import { describe, expect, it } from "vitest";
import { accountStatus } from "./account-status";

describe("Stripe account status", () => {
  it("maps Stripe's account fields to HomeHire's five statuses", () => {
    expect(accountStatus({ details_submitted: false, charges_enabled: false })).toBe("onboarding_incomplete");
    expect(accountStatus({ details_submitted: true, charges_enabled: false, requirements: { disabled_reason: "requirements.pending_verification" } })).toBe("pending_verification");
    expect(accountStatus({ details_submitted: true, charges_enabled: false, requirements: { disabled_reason: null } })).toBe("pending_verification");
    expect(accountStatus({ details_submitted: true, charges_enabled: true })).toBe("active");
    expect(accountStatus({ details_submitted: true, charges_enabled: false, requirements: { disabled_reason: "requirements.past_due" } })).toBe("restricted");
    expect(accountStatus({ details_submitted: true, charges_enabled: false, requirements: { disabled_reason: "rejected.fraud" } })).toBe("restricted");
  });
});
