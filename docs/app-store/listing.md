# App Store / Google Play listing (draft)

**App name:** HomeHire
**Subtitle (30 characters max):** Home jobs, without phone calls
**Category:** Lifestyle (secondary: Business)
**Age rating:** 4+ (no objectionable content; user messaging between hired parties only)
**Support URL:** https://homehire.us/help · **Marketing URL:** https://homehire.us · **Privacy policy:** https://homehire.us/privacy

## Promotional text (170 max)
Post a home job with a few photos and compare real prices from local pros, without giving out your phone number.

## Description
HomeHire is the quick, private way to get home jobs done.

FOR HOMEOWNERS
• Post a job in about a minute: a few photos and a few taps.
• No stuffed inbox: pros can't call, text or email you. They only reach you after you pick one.
• Easy to choose: real prices arrive side by side. Compare reviews and timing, then tap the one you want.
• Your info stays private: pros see only your first name and ZIP code.
• Your pro confirms within minutes, then a private chat opens so you can send your address.
• Pay after the job: by card, or cash, Venmo, Cash App or check.
• Book the same pro again, or set up repeat visits, in a couple of taps.

FOR SERVICE PROS
• No pay-per-lead: one flat monthly price, unlimited bids. HomeHire Basic's first month is free.
• Real jobs with photos and details, sent to you the moment they're posted nearby.
• Sealed bids: other pros never see your price.
• HomeHire Pro adds business tools: customers, calendar, recurring visits, invoices, card payments, reports and your team.

Services include lawn mowing, house cleaning, junk removal, pressure washing, pet waste pickup, car detailing, movers and more.

## Keywords (100 characters max)
home services,handyman,lawn,cleaning,movers,quotes,bids,local pros,contractor,junk removal,detailing

## App Review notes
- **Sign-in for reviewers**: run `npm run review:accounts` against the live database shortly before submitting. It
  creates or resets two labeled test logins and prints new passwords, which go in App Store Connect → App Review
  Information (never in the repo):
  - Homeowner: `appreview.customer@homehire.us`: one booked job with a chat, one job with a bid to pick.
  - Pro: `appreview.pro@homehire.us`: HomeHire Pro with complimentary access (nothing charged); one open job to bid on.
  These accounts live in their own "review world": real customers and pros never see them, and the admin
  dashboard leaves them out.
- Suggested note to the reviewer: "Sign in as the homeowner to see bids side by side and the chat that opens after
  a pro is hired. Sign in as the pro to see the job board and send a bid. Pros manage their HomeHire subscription on
  our website; the iPhone app doesn't sell or advertise subscriptions."
- In the iPhone app, providers aren't offered subscription purchases, prices or billing buttons (Apple's in-app
  purchase rule). Customers paying a pro by card for a real-world job (lawn mowing, cleaning and so on) uses
  Stripe, which Apple allows for physical services.
- Account deletion: Profile → Delete my account (customers); Business settings → Delete my account (providers).

## App Privacy ("nutrition label") answers — draft
Data linked to the user, used for app functionality only (no tracking, no ads, no data sold):
- Contact info: email address (login); name (first name only for customers; business name for providers)
- User content: photos (job and profile photos), messages (chat between hired parties), reviews
- Location: coarse (ZIP code only)
- Identifiers: user ID; device push token
- Purchases: subscription status (providers); payment records (card details are handled by Stripe, never by HomeHire)
- Diagnostics: none collected by HomeHire beyond server error logs
