import { describe, expect, it } from "vitest";
import { applicationFeeCents, formatFeePercent } from "./fees";

describe("DoneZo card fee", () => {
  it("is 10% of the payment, to the cent", () => {
    expect(applicationFeeCents(6500, 1000)).toBe(650);
    expect(applicationFeeCents(999, 1000)).toBe(100); // 99.9 rounds to 100
    expect(applicationFeeCents(1, 1000)).toBe(0);
    expect(applicationFeeCents(12345, 1000)).toBe(1235); // 1234.5 rounds up
  });
  it("rejects nonsense amounts", () => {
    expect(() => applicationFeeCents(0, 1000)).toThrow();
    expect(() => applicationFeeCents(100.5, 1000)).toThrow();
    expect(() => applicationFeeCents(100, -1)).toThrow();
  });
  it("formats the rate for people", () => {
    expect(formatFeePercent(1000)).toBe("10%");
    expect(formatFeePercent(875)).toBe("8.75%");
  });
});
