/** Rough route planning from ZIP-code centers (no paid maps service). Distances are straight-line estimates. */

export type Point = { lat: number; lng: number };

export function milesBetween(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Nearest-next-stop ordering. Stops without a location keep their place at the end, in the order given.
 * Ties (e.g. same ZIP) keep their original order, so same-area visits stay in time order.
 */
export function orderStops<T extends { point: Point | null }>(start: Point | null, stops: T[]): T[] {
  const located = stops.filter((s) => s.point);
  const unlocated = stops.filter((s) => !s.point);
  if (!located.length) return stops.slice();
  const out: T[] = [];
  const left = located.slice();
  let here: Point = start ?? left[0].point!;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) {
      if (milesBetween(here, left[i].point!) < milesBetween(here, left[best].point!) - 1e-9) best = i;
    }
    const [next] = left.splice(best, 1);
    out.push(next);
    here = next.point!;
  }
  return [...out, ...unlocated];
}

/** Total straight-line miles along the stops in order (from the start point, if given). */
export function routeMiles(start: Point | null, points: (Point | null)[]): number {
  let total = 0;
  let here = start;
  for (const p of points) {
    if (!p) continue;
    if (here) total += milesBetween(here, p);
    here = p;
  }
  return total;
}

/** A Google Maps directions link for the addresses in order (Google allows up to 9 stops in between). */
export function googleMapsDirectionsUrl(addresses: string[], origin?: string): string | null {
  if (!addresses.length) return null;
  const stops = addresses.slice(0, 10);
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1);
  const u = new URL("https://www.google.com/maps/dir/");
  u.searchParams.set("api", "1");
  if (origin) u.searchParams.set("origin", origin);
  u.searchParams.set("destination", destination);
  if (waypoints.length) u.searchParams.set("waypoints", waypoints.join("|"));
  u.searchParams.set("travelmode", "driving");
  return u.toString();
}
