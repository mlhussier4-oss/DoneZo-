import { describe, expect, it } from "vitest";
import { rankProgress } from "./ranks";

describe("provider ranks", () => {
  it("counts up to Bronze, Silver, Gold and Emerald", () => {
    expect(rankProgress(0)).toMatchObject({ current: null, next: { name: "Bronze" }, toNext: 5, percent: 0 });
    expect(rankProgress(3)).toMatchObject({ current: null, toNext: 2, percent: 60 });
    expect(rankProgress(5)).toMatchObject({ current: { name: "Bronze" }, next: { name: "Silver" }, toNext: 20, percent: 0 });
    expect(rankProgress(15)).toMatchObject({ current: { name: "Bronze" }, toNext: 10, percent: 50 });
    expect(rankProgress(25).current?.name).toBe("Silver");
    expect(rankProgress(50).current?.name).toBe("Gold");
    expect(rankProgress(100)).toMatchObject({ current: { name: "Emerald" }, next: null, toNext: 0, percent: 100 });
    expect(rankProgress(250).current?.name).toBe("Emerald");
  });
});
