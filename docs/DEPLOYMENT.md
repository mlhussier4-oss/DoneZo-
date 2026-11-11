# Deploying DoneZo

**Domain: donezo.org** (bought by the owner on Cloudflare, 2026-11-11). **Status: not deployed.** Nothing here has been done yet. Putting DoneZo online needs the owner's approval
because it creates paid accounts and makes the site public (CLAUDE.md rule 9). Stripe stays in **test mode**
until the owner separately approves live payments.

## Recommended setup

| Piece | Service | Why | Expected cost (check official pricing pages) |
|---|---|---|---|
| Website | **Vercel**, Pro plan | Made by the company behind Next.js; zero-config deploys, HTTPS, logs. The free Hobby plan is for non-commercial use only. | about $20/month per team member |
| Database, logins, file storage | **Supabase Cloud**, Pro plan | The same system we develop against locally. Free projects pause when idle and have no backups. | about $25/month |
| Email (sign-in codes, invites) | **Resend** (via Supabase custom SMTP) | Supabase's built-in email is only for testing and is heavily rate-limited. | free up to 3,000 emails/month and 100/day; about $20/month after |
| Domain name | any registrar | e.g. donezo.com (availability unknown) | about $10–$50/year |
| Payments | **Stripe** | already set up (test mode) | Stripe's per-transaction fees only |

Total to start: **about $45–$65/month** plus the domain.

**Owner decision 2026-11-11: start on free plans** for a private test (Vercel Hobby, Supabase Free, Resend Free; Stripe test mode, no real charges). Move to Supabase Pro and paid hosting before charging real providers.

### donezo.org on Cloudflare
- The owner manages the domain in their own Cloudflare account; nobody else needs the login.
- Website: add the DNS records Vercel shows when the domain is added to the Vercel project (usually an `A` record for `donezo.org` and a `CNAME` for `www`), with Cloudflare's proxy set to **DNS only** (grey cloud) so Vercel can issue the HTTPS certificate.
- Sending email (Resend): add the SPF/DKIM records Resend shows for a sending subdomain such as `mail.donezo.org`; sender `DoneZo <no-reply@donezo.org>`.
- Receiving email: Cloudflare Email Routing (free) can forward `support@donezo.org` to the owner's inbox; set `NEXT_PUBLIC_SUPPORT_EMAIL=support@donezo.org`.

## One-time setup (in this order)

1. **Supabase project**: create a project in a US region. In *Project settings → API*, copy the URL, the publishable key and the secret key.
2. **Database**: from this repository, link and push migrations:
   `npx supabase link --project-ref <ref>` then `npx supabase db push`. This creates every table, rule, function, scheduled job (pg_cron) and storage bucket, plus the ZIP-code and service-category reference data. No test data is included.
3. **Supabase Auth settings** (dashboard → Authentication):
   - Site URL = `https://donezo.org`; add `https://donezo.org/auth/confirm` to Redirect URLs.
   - Email templates: copy from `supabase/templates/` (confirmation, magic link/code, recovery, invite).
   - Custom SMTP: Resend's SMTP details, sender e.g. `DoneZo <no-reply@yourdomain>`.
   - Passwords: minimum 8, "letters and digits"; "Secure password change" on. Email OTP expiry 900 s. Email sending interval 60 s.
   - Turn on leaked-password protection if the plan offers it.
4. **Vercel project**: import the GitHub repository. Set the environment variables below (Production only). Add the domain.
5. **Stripe (test mode first)**: Dashboard → Developers → Webhooks, add endpoint `https://donezo.org/api/stripe/webhook`:
   - *Your account* events (subscriptions): `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
   - A second endpoint for *Connected accounts* (providers' card payments): `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `account.updated`.
   - Copy each signing secret into `STRIPE_WEBHOOK_SECRET` / `STRIPE_CONNECT_WEBHOOK_SECRET`.
   - Customer portal: enable cancel and payment-method updates.
6. **First admin**: run `node scripts/create-admin.mjs <email>` against the production project (see README).
7. **Smoke test** on the live address in test mode: sign up a provider, subscribe with Stripe test card 4242 4242 4242 4242, invite an employee, post a job as a customer from a phone, bid, accept, pay an invoice by card, refund it, check Reports.

## Environment variables (Vercel → Settings → Environment Variables)

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://donezo.org` (must be https) |
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | from Supabase |
| `SUPABASE_SECRET_KEY` | from Supabase (secret) |
| `STRIPE_SECRET_KEY` | `sk_test_...` until live payments are approved (secret) |
| `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET` | from step 5 (secret) |
| `STRIPE_ALLOW_LIVE` | `false` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | optional, e.g. `support@<your domain>` |

Never set `STRIPE_API_HOST`, `MAILPIT_URL` or other test settings in production.
The server checks these at start-up and refuses to serve pages if a required one is missing, the site URL isn't https,
the Stripe test simulator is configured, or a live Stripe key is present without `STRIPE_ALLOW_LIVE=true`.

## Before opening to the public (checklist)

- [ ] Owner approves hosting accounts and monthly cost.
- [ ] Attorney reviews `/terms` and `/privacy`; bracketed blanks filled in; "Draft" banner removed (`src/components/legal/legal-page.tsx`).
- [ ] Business legal name, address and support email decided.
- [ ] Domain bought and connected; email sending domain verified in Resend (SPF/DKIM).
- [ ] Logo replaced (current one is a placeholder).
- [ ] Full smoke test above passes in test mode on the live address.
- [ ] Separate owner approval to switch Stripe to live mode: live keys, live webhooks, `STRIPE_ALLOW_LIVE=true`, Stripe Connect platform profile completed.

## Operating it

- **Errors**: each server error is logged as one JSON line with a code (`digest`) that users also see. Find it in Vercel → Logs.
- **Backups**: Supabase Pro takes daily backups. Consider point-in-time recovery once real payments flow.
- **Database changes**: always via new files in `supabase/migrations/` and `npx supabase db push`; never edit tables by hand in production.
- **Security checks**: `npm test` includes an automated audit (row-level security on every table, no public write access, server-only payment functions). Run it before every database change.
