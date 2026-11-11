/** Formatting helpers. Money is stored in whole cents everywhere. */

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatMoney(cents: number | null | undefined): string {
  return usd.format((cents ?? 0) / 100);
}

/** Parse "45", "45.5", "$1,045.50" into cents. Returns null if not a valid amount. */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

/** Percent string ("8.25") to basis points (825). */
export function parsePercentToBps(input: string): number | null {
  const cleaned = input.replace(/[%\s]/g, "");
  if (cleaned === "") return 0;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(cleaned)) return null;
  const bps = Math.round(Number(cleaned) * 100);
  return bps <= 10000 ? bps : null;
}

export function bpsToPercent(bps: number): string {
  return (bps / 100).toString();
}

export function formatDate(value: string | Date | null | undefined, timeZone?: string): string {
  if (!value) return "—";
  // Plain dates ("2026-11-10") are calendar days: format them without shifting time zones.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
      timeZone: "UTC", month: "short", day: "numeric", year: "numeric",
    });
  }
  return new Date(value).toLocaleDateString("en-US", { timeZone, month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined, timeZone: string): string {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString("en-US", {
    timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function formatTime(value: string, timeZone: string): string {
  return new Date(value).toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
}

/** The calendar date (YYYY-MM-DD) of an instant in a time zone. */
export function localDateKey(value: string | Date, timeZone: string): string {
  return new Date(value).toLocaleDateString("en-CA", { timeZone });
}

/** The local date and time ("2026-11-10", "09:30") of an instant, for form inputs. */
export function toLocalInputs(value: string | null, timeZone: string): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const d = new Date(value);
  return {
    date: d.toLocaleDateString("en-CA", { timeZone }),
    time: d.toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }),
  };
}

/**
 * Convert a local date + time in a business's time zone to a UTC ISO string.
 * Works across daylight-saving changes by correcting with the zone's actual offset.
 */
export function zonedToUtcIso(date: string, time: string, timeZone: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offset = (instant: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).formatToParts(new Date(instant));
    const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - instant;
  };
  let utc = guess - offset(guess);
  utc = guess - offset(utc);
  return new Date(utc).toISOString();
}
