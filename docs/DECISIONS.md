# Decisions log

Decisions the owner has approved, and questions still open. Newest at the top of each section.

## Approved

- **2026-11-10 — Working brand name:** DoneZo. Kept in one config file so it can be changed later.
- **2026-11-10 — Customer signup:** customers fill in the job first, then confirm with a one-time email code at "Post Job". No password.
- **2026-11-10 — Build order:** CRM before marketplace. Phases are now: 1 Foundation, 2 CRM, 3 Marketplace, 4 Payments, 5 Advanced, 6 Launch.

## Waiting for the owner

1. **Stripe charge type.** Recommended: direct charges. The provider is the seller of record and handles processing fees, refunds and disputes; the platform takes an application fee on marketplace payments only. Needs review by an accountant or lawyer before live mode.
2. **Marketplace fee.** The percentage, and whether it is refunded when a job is refunded.
3. **Launch area.** US only, with providers choosing a home ZIP plus a radius in miles? Which city or region first?

## Defaults in use until the owner says otherwise

- Each visit is its own job (a weekly service creates one job per week), so every visit can be completed, photographed and invoiced separately.
- Recurring services keep 90 days of visits on the calendar.
- "Revenue" on the dashboard means payments received (recorded or, later, Stripe-verified), not invoices sent.
- Invoices start with a 14-day due date; estimates are valid for 30 days. Both can be changed per document.

- Job requests stay open for 7 days.
- Reviews go from customer to provider only.
- Invoice tax is a rate the provider enters (no automatic tax calculation).
- "Verified" badges are granted by an admin after a manual document check.
- Everyone is on a free plan with all features until subscription pricing is approved.

## Business risk noted (no change made)

Card entry is not required, cash/Venmo/Cash App carry no fee, and the address is revealed when a bid is accepted. Customers and providers can therefore settle off-platform easily, so marketplace fee income may be small and subscriptions are likely to be the main revenue.
