import { describe, expect, it } from "vitest";
import { formatMoney, parseMoneyToCents, parsePercentToBps, toLocalInputs, zonedToUtcIso } from "./format";

describe("money", () => {
  it("parses dollar amounts into cents", () => {
    expect(parseMoneyToCents("45")).toBe(4500);
    expect(parseMoneyToCents("45.5")).toBe(4550);
    expect(parseMoneyToCents("$1,045.07")).toBe(104507);
    expect(parseMoneyToCents("0")).toBe(0);
    expect(parseMoneyToCents("-5")).toBeNull();
    expect(parseMoneyToCents("4.555")).toBeNull();
    expect(parseMoneyToCents("abc")).toBeNull();
  });
  it("formats cents as dollars", () => {
    expect(formatMoney(104507)).toBe("$1,045.07");
  });
  it("parses tax percentages to basis points", () => {
    expect(parsePercentToBps("8.25")).toBe(825);
    expect(parsePercentToBps("")).toBe(0);
    expect(parsePercentToBps("101")).toBeNull();
  });
});

describe("time zones", () => {
  it("converts local business time to UTC across daylight saving", () => {
    expect(zonedToUtcIso("2026-07-01", "09:00", "America/New_York")).toBe("2026-07-01T13:00:00.000Z");
    expect(zonedToUtcIso("2026-12-01", "09:00", "America/New_York")).toBe("2026-12-01T14:00:00.000Z");
    expect(zonedToUtcIso("2026-07-01", "09:00", "America/Los_Angeles")).toBe("2026-07-01T16:00:00.000Z");
  });
  it("round-trips to form inputs", () => {
    expect(toLocalInputs("2026-12-01T14:00:00.000Z", "America/New_York")).toEqual({ date: "2026-12-01", time: "09:00" });
  });
});
