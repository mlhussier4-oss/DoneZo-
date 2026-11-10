# Build progress

Phase order approved 2026-11-10: 1 Foundation → 2 CRM → 3 Marketplace → 4 Payments → 5 Advanced → 6 Launch.

Next up: **Phase 3 — Marketplace.**

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
