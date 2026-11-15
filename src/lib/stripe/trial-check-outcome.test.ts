import { describe, expect, it } from "vitest";
import { cardCheckMessage, holdPassed } from "./trial-check-outcome";

describe("free-month card check", () => {
  it("passes only when the bank approved the hold", () => {
    expect(holdPassed("requires_capture")).toBe(true);
    expect(holdPassed("succeeded")).toBe(true);
    for (const s of ["requires_payment_method", "requires_action", "canceled", "processing", null, undefined]) expect(holdPassed(s)).toBe(false);
  });
  it("explains a decline without card details", () => {
    expect(cardCheckMessage("insufficient_funds")).toMatch(/enough funds/);
    expect(cardCheckMessage("stolen_card")).toBe("Your card couldn't be verified. Please try another card.");
  });
});
