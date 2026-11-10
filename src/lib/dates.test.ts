import { describe, expect, it } from "vitest";
import { addDays, addMonths, daysBetween, startOfWeek } from "./dates";

describe("calendar day math", () => {
  it("finds the Monday of a week", () => {
    expect(startOfWeek("2026-11-10")).toBe("2026-11-09"); // Tuesday -> Monday
    expect(startOfWeek("2026-11-15")).toBe("2026-11-09"); // Sunday -> previous Monday
    expect(startOfWeek("2026-11-09")).toBe("2026-11-09");
  });
  it("adds days and months across boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-01");
    expect(daysBetween("2026-11-09", "2026-11-12")).toEqual(["2026-11-09", "2026-11-10", "2026-11-11"]);
  });
});
