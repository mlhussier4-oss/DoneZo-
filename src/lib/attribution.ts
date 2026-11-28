/**
 * Where a sign-up came from (owner request 2026-11-28). On a person's first visit, the proxy notes the ad tags
 * (utm_*), the website that linked to HomeHire, the page they landed on and any referral code, in a first-party
 * cookie for 90 days. Sign-up copies it into the new account (user metadata → public.signup_sources), so the
 * admin dashboard can show which ads, sites and campaigns bring customers and pros. Nothing is shared with
 * ad networks; this is HomeHire's own record.
 */
export const ATTRIBUTION_COOKIE = "hh_src";
export const ATTRIBUTION_MAX_AGE = 60 * 60 * 24 * 90;

export type Attribution = {
  source?: string; medium?: string; campaign?: string; content?: string;
  referrer?: string; landing?: string; ref?: string;
};

const clean = (v: string | null | undefined, max = 80) => {
  const s = (v ?? "").trim().toLowerCase().replace(/[^a-z0-9 ._\-/:+]/g, "").slice(0, max);
  return s || undefined;
};

/** Build the first-touch record from the landing URL and the Referer header. */
export function attributionFromVisit(url: URL, referer: string | null, ownHosts: string[]): Attribution {
  const q = url.searchParams;
  let referrer: string | undefined;
  if (referer) {
    try {
      const host = new URL(referer).hostname.replace(/^www\./, "");
      if (!ownHosts.some((h) => host === h || host.endsWith(`.${h}`))) referrer = clean(host, 60);
    } catch { /* not a URL */ }
  }
  const out: Attribution = {
    source: clean(q.get("utm_source")),
    medium: clean(q.get("utm_medium")),
    campaign: clean(q.get("utm_campaign")),
    content: clean(q.get("utm_content")),
    referrer,
    landing: clean(url.pathname, 120),
    ref: clean(q.get("ref"), 12),
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v)) as Attribution;
}

export function encodeAttribution(a: Attribution): string {
  return encodeURIComponent(JSON.stringify(a));
}

/** Read the cookie back, keeping only known, cleaned fields (it's user-controlled, so never trusted as-is). */
export function decodeAttribution(raw: string | undefined | null): Attribution | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const pick = (k: keyof Attribution, max?: number) => (typeof v[k] === "string" ? clean(v[k] as string, max) : undefined);
    const out: Attribution = {
      source: pick("source"), medium: pick("medium"), campaign: pick("campaign"), content: pick("content"),
      referrer: pick("referrer", 60), landing: pick("landing", 120), ref: pick("ref", 12),
    };
    const kept = Object.fromEntries(Object.entries(out).filter(([, x]) => x)) as Attribution;
    return Object.keys(kept).length ? kept : null;
  } catch {
    return null;
  }
}
