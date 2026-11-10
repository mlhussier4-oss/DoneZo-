# Decisions log

Decisions the owner has approved, and questions still open. Newest at the top of each section.

## Approved

_None yet._

## Waiting for the owner

1. **Build order.** Recommended: build the CRM (blueprint Phase 3) before the marketplace (Phase 2), because accepting a bid creates a CRM customer record and a CRM job. Business model unchanged.
2. **Customer signup timing.** Recommended: customers fill in the job first, then confirm with a one-time code by email or text at "Post Job". No password.
3. **Working brand name.** "DoneZo" (from the repository name) or a neutral placeholder.
4. **Stripe charge type.** Recommended: direct charges. The provider is the seller of record and handles processing fees, refunds and disputes; the platform takes an application fee on marketplace payments only. Needs review by an accountant or lawyer before live mode.
5. **Marketplace fee.** The percentage, and whether it is refunded when a job is refunded.
6. **Launch area.** US only, with providers choosing a home ZIP plus a radius in miles? Which city or region first?

## Defaults in use until the owner says otherwise

- Job requests stay open for 7 days.
- Reviews go from customer to provider only.
- Invoice tax is a rate the provider enters (no automatic tax calculation).
- "Verified" badges are granted by an admin after a manual document check.
- Everyone is on a free plan with all features until subscription pricing is approved.

## Business risk noted (no change made)

Card entry is not required, cash/Venmo/Cash App carry no fee, and the address is revealed when a bid is accepted. Customers and providers can therefore settle off-platform easily, so marketplace fee income may be small and subscriptions are likely to be the main revenue.
