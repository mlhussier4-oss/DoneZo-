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
