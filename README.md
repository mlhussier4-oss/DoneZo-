# DoneZo

A home-services marketplace (customers post jobs, local providers send sealed bids) combined with a business-management platform providers can use on its own.

- Product specification: [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md)
- Approved decisions and open questions: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Build progress: [`docs/PROGRESS.md`](docs/PROGRESS.md)

## Technology

| Part | Choice |
|---|---|
| Website | Next.js 16 (App Router) + TypeScript + React 19 |
| Styling | Tailwind CSS 4, design tokens in `src/app/globals.css` |
| Database, logins, file storage | Supabase (PostgreSQL with Row Level Security) |
| Tests | Vitest (database security tests), Playwright (browser tests) |

## Running it on your computer

You need [Node.js 22+](https://nodejs.org) and [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running).

1. Install the project's libraries:

   ```bash
   npm install
   ```

2. Start the local database, login system and test inbox (the first run downloads several hundred MB):

   ```bash
   npm run db:start
   ```

   If the download fails with "Data limit exceeded", run it from Docker Hub instead:

   ```bash
   SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io npm run db:start
   ```

3. Copy `.env.example` to `.env.local` and fill in the two keys printed by the previous step (`PUBLISHABLE_KEY` and `SECRET_KEY`).

4. Start the website:

   ```bash
   npm run dev
   ```

   Open http://127.0.0.1:3000. **Use `127.0.0.1`, not `localhost`**, so login cookies match the email links.

### Useful local addresses

| What | Address |
|---|---|
| Website | http://127.0.0.1:3000 |
| Test inbox (every email the site sends locally lands here) | http://127.0.0.1:54324 |
| Database admin (Supabase Studio) | http://127.0.0.1:54323 |

### Creating an administrator

Admins can't sign up on the website, by design. Create one with:

```bash
npm run admin:create -- you@example.com "a-long-strong-password" "Your Name"
```

Then log in at `/login` → **Provider or admin**.

## Testing

```bash
npm test                 # database security tests (needs the local database running)
npm run build            # build the website
npm run test:e2e         # browser tests: sign-up, login, permissions, phone layout
npm run lint
npm run typecheck
npm run db:types         # regenerate TypeScript types after changing the database
```

## Stripe (payments)

DoneZo uses Stripe in **test mode** (pretend money) until the owner approves going live.

- **$9.99/month subscription** (Stripe Billing on DoneZo's own account). Providers can't use the CRM or marketplace without it; this is enforced in the database too.
- **Card payments** go straight to each provider's own Stripe account (Stripe Connect **direct charges**, created with Stripe's Accounts v2). DoneZo's **10% fee** is taken automatically as an application fee and is refunded with refunds.
- **Payments are only marked paid when Stripe's signed webhook confirms them.** Duplicate webhooks are ignored.

### Setting up Stripe locally
1. Put your test secret key in `.env.local` as `STRIPE_SECRET_KEY` (see `.env.example`).
2. To receive webhooks on your computer, install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and run:
   ```bash
   stripe listen --forward-to 127.0.0.1:3000/api/stripe/webhook --forward-connect-to 127.0.0.1:3000/api/stripe/webhook
   ```
   and copy the `whsec_...` secret it prints into `STRIPE_WEBHOOK_SECRET`.
3. When deployed, create webhook endpoints in the Stripe Dashboard pointing at `https://<your-domain>/api/stripe/webhook` for these events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`,
   `charge.refunded`, `account.updated`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   (the account/charge/checkout ones on the **Connected accounts** endpoint).

### Automated tests and Stripe
Browser tests never touch real Stripe. They run against Stripe's official local simulator (`npm run stripe:mock`, needs Docker) and send webhook events signed the same way Stripe signs them.

## Environment variables

| Name | Where it's used | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Links in emails, redirects | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server (safe to expose; Row Level Security protects data) | No |
| `SUPABASE_SECRET_KEY` | Admin script and tests only. **Never** in browser code, never committed | **Yes** |
| `MAILPIT_URL` | Tests read emails from the local inbox | No |
| `STRIPE_SECRET_KEY` | Server only: talks to Stripe (test key) | **Yes** |
| `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET` | Server only: verifies Stripe webhooks | **Yes** |
| `STRIPE_ALLOW_LIVE` | Must be `true` to allow live payments (owner approval) | No |

`.env.local` is ignored by git. Never commit real keys.

## How permissions work

- Every database table has **Row Level Security**: the database itself refuses to return another business's records, whatever the website asks for.
- Tables are not exposed to the API automatically; each has explicit, minimal grants (`supabase/migrations/`).
- Role changes, the marketplace switch and admin actions go through database functions that check permissions themselves. Admin actions are written to an append-only audit log.
- Pages check the user's role on the server; the menu hiding a link is never the only protection.
- Team roles: `is_business_member` means owner or manager; `is_business_staff` means anyone on the team. Employees reach jobs only through `job_assignments`, and a trigger limits what they may change on a job.
- Invitations: the invited person joins only when they confirm the invite email (`handle_user_confirmed` trigger). Restart Supabase after editing an email template in `supabase/templates/`.

## Project layout

```
docs/                   Blueprint, decisions, progress
supabase/migrations/    Database structure and security rules
supabase/templates/     Login and confirmation email templates
src/app/(public)/       Homepage, "For providers", post-a-job wizard, public provider profiles (/pros)
src/app/(auth)/         Sign up, log in, password reset
src/app/provider/       Provider dashboard and CRM (customers, jobs, recurring, calendar, invoices, payments, reports)
src/app/customer/       Customer dashboard: requests, bids, bookings, messages, payments, notifications
src/app/admin/          Admin area
src/app/(public-docs)/  Invoice and estimate pages customers open from a link
src/components/         Reusable UI (buttons, cards, forms, navigation)
src/config/brand.ts     Brand name and tagline. Change here to rebrand.
src/lib/auth.ts         Who is signed in, and role checks
tests/db/               Database security tests
tests/e2e/              Browser tests
scripts/                Admin account script
```
