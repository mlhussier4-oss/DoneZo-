# Build progress

Phase order approved 2026-11-10: 1 Foundation → 2 CRM → 3 Marketplace → 4 Payments → 5 Advanced → 6 Launch.

Next up: **Phase 6 — Launch preparation** (waiting for the owner's go-ahead).

## Phase 5 — Advanced business management ✅ (built and tested 2026-11-11)

### Works
- **Team page** (menu: Team). The owner invites managers or employees; managers invite employees. The person gets an email naming the business, clicks it, chooses a password and joins. They join only when they accept, not when the email is sent. Pending invites show as "Invited" and can be canceled. Owners can change roles and remove people; removed people lose access immediately and their past work stays in the records.
- **Roles, enforced in the database:** owner (everything); manager (day-to-day running: customers, jobs, invoices, payments, reports, marketplace; not billing or Stripe); employee (only jobs assigned to them, with the customer's name, address and phone; may start or complete those jobs, add notes and photos; no invoices, payments, reports, customer list or marketplace).
- **Job assignment:** managers tick team members on a job page. Assigned people get a notification. Recurring services can have a default person; new visits are assigned to them automatically, and changing the default hands over upcoming untouched visits.
- **My jobs** (employees' home): today, coming up and recent jobs, with a Directions link on each job.
- **Calendar:** filter by person or "Unassigned"; each visit shows the initials of who's assigned.
- **Jobs list** shows who's assigned.
- **Route planning** (optional tool): a day's stops in suggested order (shortest drive, estimated from ZIP code centers and starting from the business's home ZIP if it has one) or by appointment time, plus an "Open in Google Maps" button for turn-by-turn directions. No paid maps service. The estimate is clearly labelled as one.
- **Advanced reports:** presets (this month, last month, last 30 days, last 3 months, this year) or any custom dates. The report shows:
  - revenue net of refunds, split into Stripe-verified card and provider-recorded payments;
  - the DoneZo fee and the amount invoiced;
  - completed jobs, average job value and new customers;
  - revenue over time (by day, week or month);
  - revenue by payment method and by service;
  - completed jobs by team member;
  - top customers;
  - unpaid invoices by age (not yet due, 1–30, 31–60, over 60 days late), listing the oldest.
- **CSV download** of every payment in the range, ready for a spreadsheet.
- **Fix:** the overview dashboard now subtracts refunds from revenue.

### Tests
- Database: 105 tests, including invitations (forged or mismatched tokens are rejected; people join only on acceptance), what employees can and cannot see or change, report figures, aging buckets, and reports refused for employees and other businesses.
- Unit: 19 tests (route ordering and Google Maps link, report date ranges, CSV escaping).
- Browser: 26 tests. The new one covers the whole flow: invite, accept by email, assign, the employee sees only their job and completes it, they're blocked from everything else, the report credits them, CSV download, and the route.

### Not yet done / notes
- Employees can see a job's price. See "Waiting for the owner".
- Route order is a straight-line estimate between ZIP code centers; Google Maps gives real roads and times. Google links take up to 10 stops.
- No time tracking or payroll (not in the Blueprint).


## Phase 4 — Payments ✅ (built and tested 2026-11-11, Stripe test mode)

### Works
- **Required $9.99/month subscription** (owner decision): new providers land on a Subscribe page after confirming their email and pay on Stripe's secure checkout. Every provider page is locked until Stripe confirms; the database also refuses changes, bids and new bookings for businesses without an active subscription. Past-due (card being retried) keeps access; canceled locks it again without deleting anything. Providers manage their card, receipts and cancellation on Stripe's billing page ("Manage billing").
- **Connect Stripe** (Stripe Connect, Accounts v2, direct charges): providers sign up on Stripe's hosted pages (DoneZo never sees bank details). Status shown as **Not connected / Onboarding incomplete / Pending verification / Active / Restricted**; card payments only appear once Stripe says the account can accept them.
- **Card payments with DoneZo's 10% fee** on every card payment (CRM and marketplace, owner decision): "Pay by card" on the customer's invoice link, or a payment link the provider creates. The fee is set by admins (default 10%, logged).
- **Mark Complete & Send Payment** for marketplace jobs: one tap moves the job to Awaiting payment, sends the invoice at the agreed price and posts the payment link in the customer chat (which notifies the customer). The verified payment completes the job, notifies both sides and opens the review.
- **Only verified Stripe webhooks mark anything paid**; returning to the success page shows "confirming" instead. Signatures are checked, duplicate events ignored, failed events retried by Stripe.
- **Statuses:** Not requested / Payment link sent: awaiting payment / Payment failed / Paid / Refunded.
- **Refunds** from the invoice or Payments page refund DoneZo's fee too, and show once Stripe confirms.
- **Card vs. cash are kept separate:** "Verified by Stripe" vs. "Recorded by you"; no fee on cash, Venmo, Cash App or check.
- **Payouts shown separately** from payments ("Deposited", "On its way"…), with a link to the provider's own Stripe dashboard.
- **Admin Payments page:** active subscriptions, card volume, DoneZo fees earned after refunds, recent card payments, fee setting.
- **Safety lock:** DoneZo refuses live Stripe keys and live events unless `STRIPE_ALLOW_LIVE=true` is set with the owner's approval.

### Tests
- Database: 11 new tests (101 total with helper tests) — paid-access gate (blocked, past-due, canceled, unsubscribed providers can't bid or be hired), providers can't grant themselves a subscription or Stripe account, verified payment with 10% fee recorded once even if Stripe repeats the event, failed links never show paid, partial and full refunds, providers can't fake or edit Stripe payments, webhook-only functions locked down, event ids stored once, fee setting admin-only.
- Browser (against Stripe's local simulator with Stripe-signed webhooks): 4 new tests (25 total) — subscribe gate and cancellation; card link → customer pays → forged signature rejected → duplicate ignored → paid → fee → refund; cash-only provider; marketplace Mark Complete & Send Payment → payment completes the job.
- **Checked against the owner's real Stripe test account:** subscription checkout (customer, $9.99 price and checkout page created) and Connect onboarding (connected account created with Accounts v2; status read back as "Onboarding incomplete").

### Not yet done / notes
- **End-to-end with real Stripe** still needs a person to click through Stripe's hosted pages (enter test card 4242 4242 4242 4242, fill in a test provider's onboarding) and a webhook connection (Stripe CLI locally, or the dashboard once deployed). Steps are in the README.
- Text (SMS) payment links aren't sent yet; the link goes in the app chat and the invoice page.
- Stripe may report Accounts v2 changes with newer-style events; DoneZo also re-checks a provider's status with Stripe whenever their Payments page is opened, so it stays correct either way.
- Legal/financial review of the payment setup is still required before live mode.

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
