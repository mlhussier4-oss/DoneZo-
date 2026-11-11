# DoneZo — instructions for Claude Code

DoneZo is a home-services marketplace (customers post jobs, providers send sealed bids) combined with a business-management CRM that providers can use on its own, without the marketplace.

## Source of truth

- `docs/BLUEPRINT.md` is the authoritative product specification, written by the business owner. Read it before starting any phase.
- `docs/DECISIONS.md` records decisions the owner has approved, and questions still waiting for an answer. Check it before asking the owner something; add to it when they decide something.

## Non-negotiable rules (from Blueprint Part 12)

1. Do not silently remove, simplify or change an important feature, and do not invent a different business model.
2. Marketplace participation is never required for CRM users. CRM-only and CRM + Marketplace share one provider account and one database.
3. Customers never enter a card to post a job or accept a bid.
4. No customer–provider messaging before a bid is accepted. Full customer addresses stay hidden from providers until then. Bids are sealed.
5. DoneZo's fee is 10% of card payments made through DoneZo (marketplace and CRM alike — owner decision 2026-11-11, replacing Blueprint rule 8). Never a fee on cash/Venmo/Cash App/check. Providers need an active subscription: DoneZo Basic $9.99/month (marketplace only) or DoneZo Pro $19.99/month (marketplace + business tools/CRM) — owner decision 2026-11-11. Pro users may keep the marketplace switched off.
6. A payment is "paid" only after a verified Stripe webhook. Handle duplicate webhooks safely. Keep provider-recorded external payments clearly distinct from Stripe-verified ones.
7. No fake data or mock functionality in place of real features; clearly label anything that is a placeholder.
8. Enforce permissions in the database (Row Level Security) and on the server, never only in the UI. One provider must never see another provider's data.
9. Never commit secrets. Stripe stays in test mode. Never deploy publicly, enable live payments, or spend money on external services without the owner's explicit approval.
10. Build in phases. Do not mark a phase complete until it is tested.

## Working with the owner

The owner is the product decision-maker and is not an experienced developer.

- Explain important technical decisions in plain English, with a recommendation.
- Decide minor implementation details yourself.
- Ask before changing anything that materially affects the business model, customer experience, payment structure or subscriptions.
- After each phase, report: what was built, what works, what is incomplete, how to test it, and decisions needed.
