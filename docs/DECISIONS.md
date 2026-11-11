# Decisions log

Decisions the owner has approved, and questions still open. Newest at the top of each section.

## Approved

- **2026-11-12 — Fast posting and live booking** (replaces the 2026-11-10 "email code at Post Job" decision):
  - Homeowners post a job **without entering an email**. They land on their dashboard, where bids appear **live** under the job (no bid emails).
  - **Picking a bid** notifies the provider immediately and opens a **chat under the job**. The homeowner shares their details there; the provider confirms with an **arrival time**.
  - The provider has **5 minutes** to confirm, shown as a **live countdown**. From **2:00 left** the homeowner can **add 10 minutes** or **drop the provider**. If time runs out, the provider loses the job and the homeowner can pick another bid; the other bids stay available until a provider confirms.
- **2026-11-11 — Look:** professional navy and gray, with yellow on buttons.
- **2026-11-11 — Support address:** support@donezo.org.
- **2026-11-11 — Bids:** customers see all bids under their job listing on their dashboard, not by email.
- **2026-11-11 — Domain: donezo.org** (bought on Cloudflare by the owner). Start on free hosting plans for a private test; upgrade before charging real providers.
- **2026-11-11 — Two provider plans** (replaces the single $9.99 plan, and changes the Blueprint's business-tools-only option):
  - **DoneZo Basic, $9.99/month:** marketplace only. Includes the profile, job board, sealed bids, the jobs they win (scheduling, messages, photos, completion), card payments for marketplace jobs with payouts, and a simple calendar of marketplace jobs.
  - **DoneZo Pro, $19.99/month:** marketplace plus all business tools: customer database, recurring services, estimates and invoices for their own customers, recorded cash/Venmo/check payments, reports and CSV, route planning, and team members.
  - Providers who only want business tools buy Pro and can keep the marketplace switched off; marketplace participation is still never forced.
  - The 10% card fee is the same on both plans. No trial.
  - Upgrading takes effect immediately, with Stripe charging the prorated difference. Downgrading takes effect at the next billing date.
  - After a downgrade, business records are kept but hidden until the provider upgrades again.
- **2026-11-11 — Employees see job prices** on jobs assigned to them (no change for now).
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

- **Create the three free accounts** (Vercel, Supabase, Resend) so DoneZo can go online for a private test at donezo.org. Paid plans (about $45/month) only before charging real providers.
- **Support email:** suggested support@donezo.org, forwarded free by Cloudflare Email Routing.
- **Business legal name and address** for the Terms and Privacy pages, and an attorney to review them.
- **Later, separately:** approval to switch Stripe from test mode to live payments.

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

- Team members (managers and employees) are included in the $9.99/month plan, with no limit on how many.
- Invitations expire after 7 days. An email that already has a DoneZo account can't be invited; the person should use a different email for work.
- An employee's job report counts each completed job they were assigned to. If two people did the job, its price is split evenly between them.
- Reports count revenue on the day a payment was received, minus refunds.

- Support requests: up to 10 per person per day; replies are shown in DoneZo with a notification (no email yet).
- Sign-in codes expire after 15 minutes; passwords need at least 8 characters with a letter and a number.

## Business risk noted (no change made)

Card entry is not required, cash/Venmo/Cash App carry no fee, and the address is revealed when a bid is accepted. Customers and providers can therefore settle off-platform easily, so marketplace fee income may be small and subscriptions are likely to be the main revenue.
