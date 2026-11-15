# HomeHire phone app (iPhone and Android)

The app is a native shell around **https://homehire.us** (Capacitor 8). It shows the live website, so its design,
features and accounts are always the same as the site, and it goes live with the site. Native extras: app icon,
launch screen, camera/photo access for job photos, and phone notifications.

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
