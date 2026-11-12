/** Split dated items into upcoming (now or later, soonest first) and the rest (most recent first). */
export function splitByNow<T>(items: T[], getDate: (item: T) => string | null, isDone: (item: T) => boolean = () => false) {
  const now = Date.now();
  const upcoming = items
    .filter((i) => {
      const d = getDate(i);
      return d !== null && new Date(d).getTime() >= now && !isDone(i);
    })
    .sort((a, b) => getDate(a)!.localeCompare(getDate(b)!));
  const rest = items.filter((i) => !upcoming.includes(i));
  return { upcoming, rest };
}

/** The moment `days` days ago, as an ISO timestamp (kept out of components so render stays pure). */
export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** True when an ISO timestamp is in the past (kept out of components so render stays pure). */
export function isPast(iso: string): boolean {
  return Date.parse(iso) <= Date.now();
}

/** A sensible default arrival: about an hour from now, rounded up to the quarter hour, as local date and time. */
export function defaultArrival(timeZone: string): { date: string; time: string } {
  const t = new Date(Math.ceil((Date.now() + 60 * 60_000) / (15 * 60_000)) * 15 * 60_000);
  const date = t.toLocaleDateString("en-CA", { timeZone });
  const time = t.toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return { date, time };
}

/** Tomorrow's date (YYYY-MM-DD) in a time zone. */
export function tomorrowKey(timeZone: string): string {
  return new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA", { timeZone });
}
