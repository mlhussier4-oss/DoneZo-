/**
 * The HomeHire phone app (mobile/) adds "HomeHireApp/ios" or "HomeHireApp/android" to its user agent
 * (capacitor.config.ts → appendUserAgent). This lets the website show app-only touches, and lets the
 * iPhone app leave out subscription purchases (Apple rule: digital subscriptions bought inside an iPhone
 * app must use Apple's in-app purchase, so the iPhone app sends providers to the website instead).
 */
export type AppPlatform = "ios" | "android";

export const APP_USER_AGENT = { ios: "HomeHireApp/ios", android: "HomeHireApp/android" } as const;

export function platformFromUserAgent(ua: string | null | undefined): AppPlatform | null {
  if (!ua) return null;
  if (ua.includes(APP_USER_AGENT.ios)) return "ios";
  if (ua.includes(APP_USER_AGENT.android)) return "android";
  return null;
}

/** Per-phone setting for the Face ID / fingerprint app lock (src/components/app/app-lock.tsx). */
export const APP_LOCK_KEY = "homehire-app-lock";

/** Inline script for <head>: marks <html data-app="ios|android"> before the page paints (no flash). */
export const appMarkerScript = `try{var u=navigator.userAgent;var p=u.indexOf(${JSON.stringify(APP_USER_AGENT.ios)})>-1?"ios":u.indexOf(${JSON.stringify(APP_USER_AGENT.android)})>-1?"android":"";if(p){document.documentElement.setAttribute("data-app",p);if(localStorage.getItem(${JSON.stringify(APP_LOCK_KEY)})==="on")document.documentElement.setAttribute("data-locked","")}}catch(e){}`;
