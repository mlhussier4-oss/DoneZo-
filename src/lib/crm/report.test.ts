import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
const { csvCell, resolveRange } = await import("./report");

describe("report helpers", () => {
  it("resolves presets and custom ranges", () => {
    expect(resolveRange({}, "2026-11-11")).toEqual({ preset: "month", from: "2026-11-01", to: "2026-11-11" });
    expect(resolveRange({ range: "last-month" }, "2026-03-15")).toEqual({ preset: "last-month", from: "2026-02-01", to: "2026-02-28" });
    expect(resolveRange({ range: "30d" }, "2026-11-11")).toEqual({ preset: "30d", from: "2026-10-13", to: "2026-11-11" });
    expect(resolveRange({ range: "year" }, "2026-11-11")).toEqual({ preset: "year", from: "2026-01-01", to: "2026-11-11" });
    expect(resolveRange({ from: "2026-01-05", to: "2026-02-01" }, "2026-11-11")).toEqual({ preset: "custom", from: "2026-01-05", to: "2026-02-01" });
    expect(resolveRange({ from: "2026-02-05", to: "2026-02-01" }, "2026-11-11").preset).toBe("month"); // backwards → default
  });

  it("escapes CSV cells and blocks spreadsheet formulas", () => {
    expect(csvCell("Plain")).toBe("Plain");
    expect(csvCell('Say "hi", ok')).toBe('"Say ""hi"", ok"');
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell(null)).toBe("");
    expect(csvCell(12.5)).toBe("12.5");
  });
});
