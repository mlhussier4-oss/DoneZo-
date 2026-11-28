import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE, attributionFromVisit, encodeAttribution } from "@/lib/attribution";

const PROTECTED_PREFIXES = ["/provider", "/customer", "/admin", "/account", "/dashboard", "/subscribe"];

/** First page view: note where the visitor came from (ad tags, referring site, landing page), for 90 days. */
function rememberFirstVisit(request: NextRequest, response: NextResponse) {
  if (request.method !== "GET" || request.cookies.has(ATTRIBUTION_COOKIE)) return;
  if (!(request.headers.get("accept") ?? "").includes("text/html") || request.headers.has("rsc") || request.headers.has("next-router-prefetch")) return;
  const own = [request.nextUrl.hostname, process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname : ""]
    .filter(Boolean).map((h) => h.replace(/^www\./, ""));
  const value = encodeAttribution(attributionFromVisit(request.nextUrl, request.headers.get("referer"), own));
  response.cookies.set(ATTRIBUTION_COOKIE, value, { maxAge: ATTRIBUTION_MAX_AGE, path: "/", sameSite: "lax", httpOnly: true, secure: request.nextUrl.protocol === "https:" });
}

export async function proxy(request: NextRequest) {
  const { response, isSignedIn } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
  rememberFirstVisit(request, response);

  if (!isSignedIn && PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = new URL(`/login?next=${encodeURIComponent(pathname + search)}`, process.env.NEXT_PUBLIC_SITE_URL ?? request.url);
    const redirect = NextResponse.redirect(url);
    // Keep any refreshed/cleared session cookies.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
