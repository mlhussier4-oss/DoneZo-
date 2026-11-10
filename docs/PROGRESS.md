# Build progress

Phase order approved 2026-11-10: 1 Foundation → 2 CRM → 3 Marketplace → 4 Payments → 5 Advanced → 6 Launch.

Next up: **Phase 4 — Payments (Stripe Connect, test mode).**

## Phase 3 — Customer marketplace ✅ (built and tested 2026-11-11)

Launch area: **Austin, TX** (35 miles around downtown, ZIP 78701). Providers set a home ZIP and a radius.

### Works
- **Post a job in under a minute** (`/post-job`): pick a service → add photos from the phone camera or library → a sentence or two, plus one or two optional quick-pick questions per service → timing (ASAP, tomorrow, within 3 days, later this week, or a date) → address and ZIP → review. New customers confirm with a 6-digit email code at the last step. **No card, no password, no long form.** ZIPs outside an open service area get a friendly "not available yet".
- **Privacy until acceptance:** providers see the service, description, photos, timing, ZIP and distance, never the customer's name, address or phone.
- **Matching:** only providers with the marketplace switched on, offering that service, whose radius covers the job's ZIP see it and get a notification. CRM-only providers never see anything.
- **Sealed bids:** price, what's included, availability, exclusions, possible extra charges and a message. Providers can edit or withdraw until the job is booked, and never see other bids.
- **Bid comparison:** provider cards with logo, rating and review count, jobs completed on DoneZo, years in business, Verified badge (admin-granted only), recent work photos, accepted payment methods, and a link to the full public profile (`/pros/…`).
- **Accepting a bid** books it in one step: the price and scope are locked, the other bids close (those providers are told), and the customer (name, phone, address) appears in the winning provider's CRM with a marketplace job, ready to schedule, complete and invoice with the Phase 2 tools.
- **Private messaging** (text and photos, live) opens only after acceptance, only between the customer and the chosen provider.
- **Change orders:** the provider proposes a new price with a reason; nothing changes unless the customer approves. Approval updates the booking, the job and any unpaid invoice. Providers can't edit a marketplace job's price or invoice lines directly, and no tax is added on top of the agreed price.
- **Job tracking for customers:** requests, bids, booking status, scheduled time, invoices (with the customer link), messages, cancel before work starts.
- **Reviews** only from the customer of a completed booking, once. Ratings on profiles come only from these reviews.
- **In-app notifications** for new jobs, new bids, accepted/closed bids, messages, change orders, cancellations and completion, with unread counts in the menu.
- **Report a problem** from any request or booking; admins see and resolve reports (logged).
- **Admin:** marketplace activity, service areas (add/close), support reports, Verify/Unverify businesses (logged).
- **Provider marketplace profile:** home ZIP, radius, years in business, services, accepted payment methods, description, logo and up to 24 past-work photos.
- Requests stay open 7 days, then expire automatically (nightly).

### Tests
- Database: 24 new marketplace tests (86 total) — posting rules and service area, who sees a job, notifications only to matching providers, CRM-only can't bid, photo access, sealed bids, accept-bid booking and CRM hand-off, losing bidders learn nothing, messaging only between the two parties, price changes only by approved change order, reviews only after completion, verification admin-only, bidders keep seeing the job they bid on but never the customer.
- Browser: 4 new tests (21 total) — the complete flow from a first-time visitor posting a job with a photo to two providers bidding, accepting, messaging both ways, an approved price change, completing the job in the CRM, the review and the public profile; out-of-area ZIP; CRM-only provider never sees the marketplace; wizard on a phone.

### Not yet done / notes
- **Email and text notifications** aren't sent yet (in-app only). SMS consent is recorded with the job so it can be honored once texting is set up.
- ZIP locations come from the Census Bureau's 2022 ZIP areas (via the `us-zips` package); a few new or PO-box-only ZIPs aren't included.
- Customer-facing times are shown in Central time (Austin).
- Card payment when the job is done is Phase 4.

## Phase 2 — Provider CRM ✅ (built and tested 2026-11-11)

Works for CRM-only providers who never use the marketplace. Marketplace customers will flow into the same screens in Phase 3.

### Works
- **Customers:** add the customers you already have (contact details, service preferences, several addresses with access notes, a first note); search by name, email or phone; archive and restore; timestamped notes. Each customer page shows upcoming visits, recurring services, job history, invoices and payments.
- **Jobs:** one job per visit, with customer, address, service, price, date/time and length. Status buttons (Start job, Mark complete, Awaiting payment, Cancel) with every change time-stamped in a history. Private job notes. **Photos** upload straight from a phone or computer (JPG/PNG/WebP/HEIC, up to 10 MB) into private storage only that business can read.
- **Recurring services:** weekly, every 2 weeks, monthly (end-of-month aware) or every N days, at a set time, with an optional end date. DoneZo keeps the next 90 days of visits on the calendar and extends them nightly. Editing, pausing or canceling changes only future visits that haven't been started or changed by hand; completed visits are never touched. Canceling a single visit doesn't bring it back.
- **Calendar:** day, week and month views in the business's time zone, color-coded by status with a legend; phone-friendly.
- **Estimates and invoices:** line items (quantity, price, taxable), tax rate, notes, due/valid-until dates. **The database calculates every total.** Numbers count up per business. Invoice a job in one click (uses the job's price). Turn an accepted estimate into an invoice. Only drafts can be deleted; sent invoices are voided instead.
- **Customer link:** "Mark as sent" gives a private link the provider can text or email. The customer sees the invoice or estimate on their phone without logging in; drafts are never visible.
- **Payment records:** record cash, Venmo, Cash App, check or other against an invoice; the invoice moves to Partly paid / Paid automatically. These are labeled **"Recorded by you"**. Card payments can't be entered by hand: they'll only ever come from Stripe, labeled "Verified by Stripe".
- **Overview and Reports:** live figures from the database — revenue this month and week, outstanding invoices, visits in the next 7 days, completed jobs, new and repeat customers, average job value, monthly revenue (last 6 months) and revenue by service (last 12 months).
- **Business settings:** time zone (US) and default sales tax rate added.
- **Forms keep what you typed** when something needs fixing (they used to clear on any error).

### Tests
- Database: 30 new CRM tests (54 total) — every table isolated between businesses, cross-business links blocked by the database, recurring generation and editing rules, invoice math and status, payment-record rules (no hand-entered card or "verified" payments), customer links, estimates, dashboard figures, photo storage permissions.
- Browser: 4 new end-to-end tests (17 total) — the full CRM-only workflow from adding a customer to a recurring service, the calendar, completing a job with a photo, invoicing, the customer link, recording cash and Venmo, and seeing the revenue on the dashboard; estimate → invoice; search and archive; another provider can't open any of it.

### Not yet done / notes
- Invoices aren't emailed automatically yet (needs an email service). Providers copy the customer link instead.
- Card payments and Stripe status are Phase 4. The Payments page says "Not connected".
- Employees and job assignment are Phase 5. Route planning is optional, Phase 5.
- Sales tax is a rate the provider enters; DoneZo doesn't calculate tax rules.

## Phase 1 — Foundation ✅ (built and tested 2026-11-10)

### Works
- **Accounts:** customers, providers and administrators, each with their own area and navigation.
- **Customer sign-up / log in:** email + 6-digit code, no password (the same flow "Post Job" will use).
- **Provider sign-up:** asks "How would you like to use our platform?" with Business Management only, or Business Management + Marketplace. Email + password, confirmed by email.
- **One provider account:** both options create the same kind of business account. The marketplace is a switch in Business settings that can be turned on or off; nothing is moved.
- **CRM-only providers never see the marketplace:** it's hidden from the menu, and the page is blocked on the server.
- **Password reset** for providers and admins.
- **Business settings:** edit name, email, phone, description.
- **Customer account page:** edit name and phone.
- **Admin area:** live platform counts, user list with suspend/reinstate, business list, service-category management, audit log.
- **Suspended users** are signed out and locked out.
- **Service categories:** the five launch categories, managed by admins; changes appear on the homepage immediately.
- **Plans and entitlements:** a "Free (beta)" plan with every feature, and no prices. Marketplace access is deliberately not a plan feature.
- **Design system:** colors, type (Inter), buttons, forms, cards, badges, alerts; responsive on phones (tested on an iPhone 13 screen size).

### Tests
- 24 database security tests (`npm test`): role tampering, provider-to-provider isolation, customer isolation, public access, admin-only functions, audit log.
- 13 browser tests (`npm run test:e2e`): full sign-up and login flows using real emails from the local inbox, marketplace on/off, cross-role access attempts, admin category management, suspension, phone layout.

### Placeholders (clearly labelled "Not built yet" in the app)
- Provider: Calendar, Customers, Jobs, Invoices, Reports (built in Phase 2); Payments (Phase 4); Employees (Phase 5); Marketplace job board (Phase 3).
- Customer: Post a job, My requests, Messages (Phase 3); Payments (Phase 4).

### Not yet done / notes
- Emails are only delivered to the local test inbox. A real email service (e.g. Resend) is needed before going online.
- Supabase's built-in rate limits protect login and code emails. Extra rate limiting for other sensitive actions comes with those features.
- The logo is a placeholder (check mark + "DoneZo").
- Dark mode isn't built; the colors are set up so it can be added.
