/**
 * "Keep me signed in" (owner request 2026-11-13). On by default: the login lasts across visits and app launches.
 * When someone unticks it (e.g. a shared computer), login cookies become session cookies that the browser
 * deletes when it closes. The choice itself is stored in a small cookie.
 */
export const REMEMBER_COOKIE = "dz_remember";

type CookieOptions = { maxAge?: number; expires?: Date | string; [k: string]: unknown };

export function sessionOnly<T extends CookieOptions | undefined>(options: T, remember: string | undefined): T {
  if (remember !== "0" || !options) return options;
  // Deleting a cookie uses maxAge 0; keep that so sign-out still works.
  if (options.maxAge === 0) return options;
  const { maxAge: _m, expires: _e, ...rest } = options;
  void _m; void _e;
  return rest as T;
}
