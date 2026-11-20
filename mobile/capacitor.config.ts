import type { CapacitorConfig } from "@capacitor/cli";

/**
 * HomeHire app (owner request 2026-11-15). The app shows homehire.us, so it always matches the website
 * (design, features, accounts) and goes live together with it. Native extras: icon, launch screen, push, camera.
 */
const config: CapacitorConfig = {
  appId: "us.homehire.app",
  appName: "HomeHire",
  webDir: "www",
  server: {
    url: "https://homehire.us",
    cleartext: false,
    // Only HomeHire (and Stripe's secure pages for payments) open inside the app; other links open in the browser.
    allowNavigation: ["homehire.us", "*.homehire.us", "checkout.stripe.com", "billing.stripe.com", "connect.stripe.com"],
    // Shown when homehire.us can't be reached (no signal): a branded "you're offline" screen with Try again.
    errorPath: "offline.html",
  },
  // The website recognises the app by this tag (src/lib/app/platform.ts): it shows app-only touches, and the
  // iPhone app leaves out subscription purchases (Apple's in-app purchase rule).
  ios: { contentInset: "automatic", scheme: "HomeHire", appendUserAgent: "HomeHireApp/ios" },
  android: { allowMixedContent: false, appendUserAgent: "HomeHireApp/android" },
  plugins: {
    SplashScreen: { launchShowDuration: 800, backgroundColor: "#14213d", showSpinner: false },
    StatusBar: { style: "DARK", backgroundColor: "#14213d" },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
