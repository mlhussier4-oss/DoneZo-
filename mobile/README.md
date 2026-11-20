# HomeHire phone app (iPhone and Android)

The app is a native shell around **https://homehire.us** (Capacitor 8). It shows the live website, so its design,
features and accounts are always the same as the site, and it goes live with the site. Native extras: app icon,
launch screen, camera/photo access for job photos, phone notifications, a bottom tab bar, an offline screen,
an optional Face ID / fingerprint lock and the phone's share sheet.

| Setting | Value |
|---|---|
| App name | HomeHire |
| Bundle / package id | `us.homehire.app` |
| Opens | https://homehire.us (other links open in the browser; Stripe's payment pages are allowed in-app) |
| Icon & launch screen | generated from `assets/` (`npm run assets`) |

## What's ready
- `ios/` Xcode project and `android/` Android Studio project, with icons, launch screens and the HomeHire name.
- iPhone permission messages for the camera and photo library.
- Notifications: when someone taps **Turn on notifications** inside the app, the site asks the phone for permission
  and saves the phone's token (`register_native_push`). **Sending** to phones is switched on once the keys below exist.
- Account deletion (Apple requirement): Profile → Delete my account (customers); Business settings / My jobs (providers).
- **App feel (Apple guideline 4.2, "more than a website")**, added 2026-11-20:
  - The app adds `HomeHireApp/ios` or `HomeHireApp/android` to its user agent (`appendUserAgent`). The site
    (`src/lib/app/platform.ts`) marks the page with `data-app` and uses the `app:` / `ios-app:` CSS variants.
  - Bottom tab bar on signed-in pages (Home / Requests / Messages / Profile for customers; Jobs, Calendar and so on
    for pros) with **More** opening the full menu.
  - Offline: `www/offline.html` (`server.errorPath`) when homehire.us can't load, plus an in-page "You're offline" bar.
  - **Face ID / Touch ID / fingerprint lock** (`@aparajita/capacitor-biometric-auth`): off by default; turned on in
    Profile (customers) or Business settings (pros); asks on open and after a minute in the background.
  - **Share sheet** (`@capacitor/share`) for referral links.
  - The site talks to these plugins through the native bridge (`src/lib/app/native.ts`), because the app loads the
    live site rather than a bundled copy of Capacitor's JavaScript.
- **Apple's in-app purchase rule**: inside the **iPhone** app, providers aren't offered subscription purchases or
  billing (no Subscribe / Upgrade / Manage billing buttons, no plan prices at sign-up; the server refuses them too).
  They see "Plans and billing are managed on the HomeHire website". Paying a pro for a job by card stays (Apple allows
  outside payments for real-world services). The Android app works like the website.
- **App reviewer logins**: `npm run review:accounts` (see App Review notes in `docs/app-store/listing.md`).

To check on a device before submitting: the tab bar, the offline screen (airplane mode), turning the Face ID lock on
and off, sharing a referral link, and that notifications arrive. These can't be exercised in a cloud container.

## What needs the owner's accounts (after the LLC and D-U-N-S number)
1. **Apple Developer Program (organization)**: needed to sign, test on a real iPhone and submit.
2. **Push keys**: an Apple Push Notifications key (.p8) from the Apple Developer site, and a free Firebase project
   (Firebase Cloud Messaging) that delivers to both iPhone and Android. Then: enable "Push Notifications" in
   Xcode (Signing & Capabilities) and add the server-side sender for `platform in ('ios','android')` rows.
3. **Google Play Console (organization, $25 once)** for Android.

## Building
iPhone apps must be built on a Mac with Xcode (or a cloud Mac build service such as Codemagic or Xcode Cloud).
```
cd mobile
npm install
npx cap sync
npx cap open ios       # on a Mac: pick the HomeHire team, then Product → Archive → Distribute
npx cap open android   # Android Studio: Build → Generate Signed App Bundle
```
