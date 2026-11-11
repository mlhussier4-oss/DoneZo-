import { describe, expect, it } from "vitest";
import { googleMapsDirectionsUrl, milesBetween, orderStops, routeMiles } from "./route";

const austin = { lat: 30.27, lng: -97.74 };
const roundRock = { lat: 30.51, lng: -97.68 };
const sanMarcos = { lat: 29.88, lng: -97.94 };

describe("route planning", () => {
  it("measures straight-line miles", () => {
    expect(milesBetween(austin, roundRock)).toBeGreaterThan(15);
    expect(milesBetween(austin, roundRock)).toBeLessThan(18);
    expect(milesBetween(austin, austin)).toBe(0);
  });

  it("visits the nearest stop next and keeps same-place stops in order", () => {
    const stops = [
      { id: "rr", point: roundRock },
      { id: "sm", point: sanMarcos },
      { id: "a1", point: austin },
      { id: "none", point: null },
      { id: "a2", point: austin },
    ];
    expect(orderStops(sanMarcos, stops).map((s) => s.id)).toEqual(["sm", "a1", "a2", "rr", "none"]);
    expect(orderStops(null, stops).map((s) => s.id)).toEqual(["rr", "a1", "a2", "sm", "none"]);
  });

  it("totals the miles", () => {
    expect(routeMiles(null, [austin, null, austin])).toBe(0);
    expect(routeMiles(austin, [roundRock])).toBeCloseTo(milesBetween(austin, roundRock));
  });

  it("builds a Google Maps link with stops in between", () => {
    const url = new URL(googleMapsDirectionsUrl(["1 A St, Austin, TX", "2 B St, Austin, TX", "3 C St, Austin, TX"], "78701")!);
    expect(url.searchParams.get("origin")).toBe("78701");
    expect(url.searchParams.get("destination")).toBe("3 C St, Austin, TX");
    expect(url.searchParams.get("waypoints")).toBe("1 A St, Austin, TX|2 B St, Austin, TX");
    expect(googleMapsDirectionsUrl([])).toBeNull();
  });
});
