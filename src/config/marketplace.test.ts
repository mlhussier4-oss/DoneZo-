import { describe, expect, it } from "vitest";
import { areaFromDimensions, detailLines } from "./marketplace";

describe("turf dimensions", () => {
  it("works out square feet from width × length, however it's typed", () => {
    expect(areaFromDimensions("15 x 25")).toBe(375);
    expect(areaFromDimensions("15x25")).toBe(375);
    expect(areaFromDimensions("15 ft x 25 ft")).toBe(375);
    expect(areaFromDimensions("15' by 25'")).toBe(375);
    expect(areaFromDimensions("12.5 × 20")).toBe(250);
    expect(areaFromDimensions("1,000 x 2")).toBe(2000);
    expect(areaFromDimensions("about half the yard")).toBeNull();
    expect(areaFromDimensions("15")).toBeNull();
  });

  it("shows providers the dimensions with the area", () => {
    expect(detailLines({ area: "Under 500 sq ft", dimensions: "15 x 25" })).toEqual(["Area: Under 500 sq ft", "Dimensions: 15 x 25 (≈ 375 sq ft)"]);
    expect(detailLines({ dimensions: "L-shaped, roughly 20 by 30 plus a strip" })).toEqual(["Dimensions: L-shaped, roughly 20 by 30 plus a strip"]);
  });
});
