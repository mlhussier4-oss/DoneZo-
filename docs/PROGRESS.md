# Build progress

Phase order approved 2026-11-10: 1 Foundation → 2 CRM → 3 Marketplace → 4 Payments → 5 Advanced → 6 Launch.

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
- Provider: Calendar, Customers, Jobs, Invoices (Phase 2); Payments (Phase 4); Employees (Phase 5); Reports (Phases 2 and 5); Marketplace job board (Phase 3).
- Customer: Post a job, My requests, Messages (Phase 3); Payments (Phase 4).

### Not yet done / notes
- Emails are only delivered to the local test inbox. A real email service (e.g. Resend) is needed before going online.
- Supabase's built-in rate limits protect login and code emails. Extra rate limiting for other sensitive actions comes with those features.
- The logo is a placeholder (check mark + "DoneZo").
- Dark mode isn't built; the colors are set up so it can be added.
