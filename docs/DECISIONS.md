# Decisions log

Decisions the owner has approved, and questions still open. Newest at the top of each section.

## Approved

- **2026-11-11 — Paid access:** providers must have an active paid subscription to use DoneZo, both the CRM and the marketplace. **$9.99/month, one price for everyone, no free trial** (paid at sign-up). Replaces the earlier free-beta default.
- **2026-11-11 — Card fee: 10% of every card payment made through DoneZo**, marketplace jobs *and* providers' own (CRM) customers. **This changes Blueprint rule 8** ("no marketplace commissions on CRM-only payments") at the owner's request. Still no fee on cash, Venmo, Cash App or check.
- **2026-11-11 — Refunds:** when a card payment is refunded, DoneZo's 10% is refunded too.
- **2026-11-11 — Technical: Stripe Accounts v2.** Stripe now requires new Connect platforms to create provider accounts with Accounts v2. Providers get a full Stripe dashboard; Stripe collects processing fees from them and covers losses (equivalent to the approved direct-charges setup).
- **2026-11-11 — Stripe charge type:** direct charges. The provider is the seller of record and handles card processing fees, refunds and disputes; DoneZo takes an application fee. Still needs an accountant/lawyer review before live mode.
- **2026-11-11 — Marketplace price is all-in:** no sales tax is added on top of an accepted bid; changes go through a customer-approved change order.
- **2026-11-11 — Service areas:** US only. Providers choose a home ZIP plus a radius in miles (1–60). Launch area: **Austin, TX** (35 miles around downtown ZIP 78701); admins can add or close areas.
- **2026-11-10 — Working brand name:** DoneZo. Kept in one config file so it can be changed later.
- **2026-11-10 — Customer signup:** customers fill in the job first, then confirm with a one-time email code at "Post Job". No password.
- **2026-11-10 — Build order:** CRM before marketplace. Phases are now: 1 Foundation, 2 CRM, 3 Marketplace, 4 Payments, 5 Advanced, 6 Launch.

## Waiting for the owner

_Nothing right now._

## Defaults in use until the owner says otherwise

- Job requests stay open 7 days and expire automatically; customers can repost.
- A customer can cancel a booking until the work has started; after that they report a problem instead.
- Provider job board shows only jobs inside the provider's radius and services.
- Each visit is its own job (a weekly service creates one job per week), so every visit can be completed, photographed and invoiced separately.
- Recurring services keep 90 days of visits on the calendar.
- "Revenue" on the dashboard means payments received (recorded or, later, Stripe-verified), not invoices sent.
- Invoices start with a 14-day due date; estimates are valid for 30 days. Both can be changed per document.

- Reviews go from customer to provider only.
- Invoice tax is a rate the provider enters (no automatic tax calculation).
- "Verified" badges are granted by an admin after a manual document check.

## Business risk noted (no change made)

Card entry is not required, cash/Venmo/Cash App carry no fee, and the address is revealed when a bid is accepted. Customers and providers can therefore settle off-platform easily, so marketplace fee income may be small and subscriptions are likely to be the main revenue.
