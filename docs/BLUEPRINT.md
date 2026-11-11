# HOME SERVICES MARKETPLACE + BUSINESS MANAGEMENT PLATFORM

## Master Product Blueprint and Claude Code Build Instructions

> This document is the authoritative product specification for DoneZo. It was written by the business owner. Do not change its requirements without the owner's explicit approval; record approved changes in `docs/DECISIONS.md`.

**Project purpose:** Build a professional, mobile-first website that combines a home-services marketplace with a complete business-management platform for independent service providers and small home-service companies.

**Important:** This is a real software product, not a landing-page demonstration. Build working functionality, database-backed features, authentication, permissions, workflows and integrations. Do not substitute static mockups for functional features.

---

# PART 1 — THE BUSINESS CONCEPT

## 1. Overall concept

The platform has two connected products:

**A. Customer marketplace**

Homeowners and customers can post a service request, upload pictures, receive competing bids from local service providers, compare providers and select the one they want to hire.

The goal is to eliminate the frustration of contacting multiple businesses individually to get quotes.

The customer experience should be extremely simple. A customer should ideally be able to submit a service request in less than one minute.

**B. Provider business-management software (CRM)**

Service providers can use the platform to manage their entire business, including customers they already have outside the marketplace.

Providers can choose between:

- Business Management Only (CRM-only).
- Business Management + Marketplace.

The CRM-only option must be a fully useful product. Providers should not have to participate in the marketplace to use the customer database, calendar, job management, invoicing and payment tools.

Providers can activate marketplace access later without creating another account or transferring their data.

**Core business strategy:** The marketplace helps providers acquire new customers. The CRM helps them operate and grow their existing business. Both functions live in one platform.

## 2. Initial service categories

Start with these five categories:

1. Junk removal.
2. Lawn mowing.
3. Pet waste pickup.
4. Pressure washing.
5. House cleaning.

Build the category system so additional categories can be introduced through administration later.

Do not expand into every conceivable contractor service during the initial build.

---

# PART 2 — CUSTOMER MARKETPLACE

## 3. Customer experience

The customer side must be exceptionally simple.

The homepage should clearly communicate:

"Post a job. Receive bids. Choose your provider."

Customers should be able to:

- Create an account.
- Post a service request.
- Upload one or more photographs.
- Select a service category.
- Enter a short description.
- Provide essential service information.
- Specify when they want the work completed.
- Receive provider bids.
- Compare providers.
- Accept a bid.
- Communicate privately with the selected provider.
- View job status.
- Receive and pay invoices.
- Review completed work.

Do not force customers to provide credit card information when posting a job or accepting a bid.

Do not make customers fill out long forms just to request a quote.

## 4. Customer job-posting workflow

The workflow should be:

**Step 1: Choose a service.** Show five large, easy-to-understand service-category cards with icons.

**Step 2: Upload photos.** Allow customers to take photographs using their phone or upload existing pictures. Support multiple images.

**Step 3: Describe the job.** Provide a short text field. Use optional category-specific questions when genuinely necessary. Avoid excessive required fields.

**Step 4: Choose timing.** Allow options such as:

- As soon as possible.
- Tomorrow.
- Within the next three days.
- Later this week.
- Choose a preferred date.

**Step 5: Provide location.** Collect the service ZIP code and the address information necessary to fulfill the job. Keep the full address private from providers until a bid is accepted.

**Step 6: Review and post.** Show a simple summary and a Post Job button.

The entire experience should be optimized for completion in under one minute.

## 5. Job marketplace

Once a customer posts a job:

- Notify eligible providers in the appropriate service area.
- Providers can view available job details and photographs.
- Providers can independently decide whether to submit a bid.
- Customers can receive multiple competing bids.
- Providers should not see other providers' bid prices.
- Providers cannot directly message customers before their bid is accepted.
- Customer identity and full address remain protected until a provider is selected.

Use private/sealed bidding.

Each bid should include:

- Provider's proposed price.
- What is included.
- Proposed availability.
- Important exclusions.
- Potential additional charges.
- A short optional message.

Do not allow providers to change the accepted price without customer approval.

Build an explicit change-order process for price or scope changes.

## 6. Customer bid-comparison screen

Customers should be able to compare bids using clear provider cards.

Each card should display:

- Business name.
- Business logo or provider photo.
- Average rating.
- Number of reviews.
- Completed job count.
- Experience.
- Previous job photographs.
- Proposed price.
- Availability.
- Verified credentials where applicable.

Customers should be able to open a provider's full profile.

Do not allow providers to purchase better ratings or fake verification badges.

## 7. Accepting a bid and messaging

When a customer accepts a bid:

1. Create the accepted booking.
2. Lock the agreed price and original scope.
3. Close the competing bids.
4. Reveal the necessary customer contact and service information to the awarded provider.
5. Open private customer-provider messaging.
6. Allow the two parties to coordinate scheduling and job details.

Do not enable direct customer-provider messaging before a bid is accepted.

Messaging should support text and photographs.

The system should retain a record of the agreed price, messages and approved changes.

## 8. Customer job tracking

Customers should have a dashboard showing:

- Open requests.
- Bids received.
- Accepted bookings.
- Upcoming appointments.
- Jobs in progress.
- Completed jobs.
- Outstanding payments.
- Previous jobs.

The customer should be able to report a problem or contact support.

Customers should be able to leave reviews after completed jobs.

Reviews should be tied to actual completed platform bookings.

---

# PART 3 — PROVIDER REGISTRATION AND TWO ACCOUNT OPTIONS

## 9. Provider registration

During registration, ask:

"How would you like to use our platform?"

Present two distinct choices.

### OPTION A: BUSINESS MANAGEMENT ONLY

For businesses that already have customers and want software to run their operations.

Include:

- Customer database.
- Customer contact information.
- Service addresses.
- Customer notes.
- Job history.
- Job photographs.
- Scheduling.
- Recurring appointments.
- Calendar.
- Job management.
- Invoicing.
- Stripe card payments.
- Cash, Venmo and Cash App payment records.
- Revenue tracking.
- Employee management as supported by the selected plan.

CRM-only providers do not need to participate in the marketplace.

They should never be forced to submit bids or receive marketplace job notifications.

### OPTION B: BUSINESS MANAGEMENT + MARKETPLACE

Includes every CRM feature above, plus:

- Provider marketplace profile.
- Service-area selection.
- Service-category selection.
- Browse eligible customer job requests.
- Submit bids.
- Receive marketplace notifications.
- Win new customers.
- Marketplace customer messaging after bid acceptance.
- Manage marketplace bookings alongside existing customers.

### Important account architecture

Both options must use the same underlying provider account.

Do not create separate CRM and marketplace databases.

Both account types must share:

- Customer records.
- Calendar.
- Jobs.
- Invoices.
- Payment records.
- Business profile.
- Notifications.
- Provider settings.

A CRM-only provider must be able to activate marketplace access later through account settings.

This should not require a new account or data migration.

---

# PART 4 — PROVIDER CRM AND BUSINESS MANAGEMENT

## 10. Provider dashboard

The provider dashboard is one of the most important parts of the product.

It should feel like professional software a small business owner would use every day.

Build a clean dashboard with navigation for:

1. Overview.
2. Calendar.
3. Customers.
4. Jobs.
5. Invoices.
6. Payments.
7. Marketplace (only when enabled).
8. Employees (where supported).
9. Reports.
10. Business settings.

Make the dashboard responsive but prioritize efficient desktop use as well as mobile use.

## 11. Customer management

Providers must be able to add customers they acquired outside the marketplace.

This is essential.

The CRM cannot be limited to customers obtained through the marketplace.

Customer records should include:

- Customer name.
- Phone number.
- Email.
- Service address.
- Notes.
- Customer history.
- Previous jobs.
- Photographs.
- Service preferences.
- Payment history.
- Recurring service information.

Allow providers to search, filter and edit their customer database.

Make it easy to add a new customer manually.

The provider must own and control their customer records, subject to privacy and data-protection requirements.

## 12. Calendar and recurring appointments

Build a professional calendar with:

- Daily view.
- Weekly view.
- Monthly view.
- Upcoming appointments.
- Completed appointments.
- Canceled appointments.
- Rescheduling.
- Appointment notes.
- Customer details.
- Job details.
- Employee assignments where supported.

Support recurring schedules:

- Weekly.
- Every two weeks.
- Monthly.
- Custom intervals.

For example: a lawn care company should be able to add a customer who receives mowing every Tuesday.

The system should automatically create future scheduled appointments according to the recurring schedule.

Providers should be able to pause, edit or cancel recurring services.

Changing a recurring schedule must not accidentally alter historical completed jobs.

## 13. Job management

Providers should be able to create and manage jobs for both:

- Marketplace customers.
- Their existing outside customers.

Every job should contain:

- Customer.
- Service address.
- Service category.
- Description.
- Agreed price.
- Scheduled date and time.
- Status.
- Notes.
- Photographs.
- Invoice/payment information.

Suggested job statuses:

- New.
- Scheduled.
- In Progress.
- Awaiting Payment.
- Completed.
- Canceled.

Allow providers to update job status.

Record timestamps for important changes.

## 14. Invoices and estimates

Allow providers to:

- Create estimates.
- Create invoices.
- Add services.
- Add line items.
- Add quantities.
- Add prices.
- Add descriptions.
- Add taxes where applicable.
- Send invoices to customers.
- Track paid and unpaid invoices.
- Resend payment requests.
- Record external payment methods.

Customers should receive mobile-friendly payment links.

CRM invoices must be available for providers' existing customers, not just marketplace customers.

## 15. Business dashboard and reports

Display useful information such as:

- Monthly revenue.
- Weekly revenue.
- Completed jobs.
- Upcoming jobs.
- New customers.
- Repeat customers.
- Outstanding invoices.
- Average job value.
- Revenue by service category.

Use real database data, not hardcoded demonstration figures.

---

# PART 5 — PAYMENTS AND STRIPE

## 16. Mandatory Stripe provider onboarding

Every provider must be required to complete the platform's Stripe onboarding process to activate card payment functionality.

Use Stripe Connect.

Use Stripe-hosted or embedded onboarding rather than collecting sensitive bank account information directly.

The platform should not store customers' raw card details or providers' bank account credentials.

A provider should be able to connect their Stripe account securely.

Show whether their Stripe account is:

- Not connected.
- Onboarding incomplete.
- Pending verification.
- Active.
- Restricted.

Do not show card payment as available until Stripe confirms the provider can accept payments.

The CRM should support recording cash and other external payments even if a provider's card onboarding is not complete, but the provider must complete the required Stripe onboarding to activate card processing.

## 17. Accepted payment methods

Every provider profile should show accepted payment methods.

Card payment through the platform should be available after Stripe onboarding.

Providers can additionally select which direct payment methods they accept:

- Cash.
- Venmo.
- Cash App.
- Other approved external methods.

The provider can manage these settings.

Do not charge the platform's marketplace transaction fee on direct cash, Venmo or Cash App payments.

The app should allow providers to record those payments.

Clearly distinguish between:

- Payment confirmed through Stripe.
- Payment marked paid by the provider using an external method.

Do not falsely represent an external payment as verified.

## 18. Marketplace completion-payment workflow

The customer must not be required to enter payment details when posting a job or accepting a bid.

The payment process happens after work is completed.

Workflow:

1. Provider opens the accepted job.
2. Provider completes the work.
3. Provider uploads completion photographs and optional notes.
4. Provider taps "Mark Complete & Send Payment."
5. The platform creates a unique Stripe Checkout Session or equivalent secure checkout for that specific job.
6. The customer receives a secure payment link through app messaging.
7. If the customer provided a phone number and consented to SMS notifications, send the link by text as well.
8. Customer opens the payment page.
9. Customer sees provider name, job details and agreed amount.
10. Customer enters card details and pays.
11. Stripe confirms payment.
12. The provider's dashboard updates to Paid.
13. The platform records its applicable marketplace fee.
14. Provider receives the remaining funds through the correctly configured Stripe Connect arrangement.

Allow payment links to be resent.

Show clear statuses:

- Not requested.
- Payment link sent.
- Awaiting payment.
- Payment failed.
- Paid.
- Refunded.

A job must never be marked Stripe-paid just because a customer returns to a success page.

Use verified Stripe webhook events to update payment status.

Handle duplicate webhook events safely.

## 19. CRM-only Stripe payment workflow

Providers must also be able to accept card payments from their existing customers.

For CRM-only jobs:

1. Provider opens the customer's job or invoice.
2. Provider creates an invoice or payment request.
3. Platform generates a secure checkout link through the provider's connected Stripe account.
4. Provider sends the link to the customer.
5. Customer pays by card.
6. Stripe confirms payment.
7. Provider's CRM records the payment.

**Important financial separation:**

- CRM-only customer payments are not marketplace transactions.
- Do not charge marketplace commissions on providers' existing customers.
- Marketplace transaction fees only apply to eligible marketplace transactions.
- Provider subscription fees are separate from job payments.

Use Stripe Connect appropriately for both payment flows.

Do not assume that every Stripe Connect charge type has the same fee, refund, dispute or merchant responsibilities. Design this correctly using current Stripe documentation and flag any decisions that require financial or legal review.

Do not describe Stripe balances as money already deposited in the provider's bank. Show payment success separately from payout status.

---

# PART 6 — PROVIDER MARKETPLACE PROFILE

## 20. Provider profile

Allow providers to create a professional public profile with:

- Business name.
- Logo.
- Provider photograph.
- Business description.
- Services offered.
- Service area.
- Years of experience.
- Portfolio photographs.
- Ratings and reviews.
- Completed platform jobs.
- Accepted payment methods.
- Verified credentials, where actually checked.

Allow providers to manage their portfolio.

The profile should help customers evaluate quality, reliability and professionalism.

Do not allow paid subscriptions to manipulate ratings, reviews or verification.

---

# PART 7 — SUBSCRIPTIONS AND MONETIZATION

## 21. Revenue model

The business should support three potential revenue sources:

1. Provider software subscriptions.
2. Marketplace transaction fees on eligible card payments.
3. Optional premium provider tools or upgrades in the future.

Do not finalize or hardcode subscription pricing until it has been approved.

Subscription plans are still being evaluated.

The software should support configurable plans and feature entitlements.

Potential future subscription levels may include:

- Basic CRM.
- Professional CRM.
- Business/Team.

Possible differences include:

- Number of customer records.
- Portfolio photographs.
- Advanced recurring schedules.
- Employee accounts.
- Advanced reporting.
- Route planning.
- Saved bid templates.

Do not charge providers per marketplace lead in the initial business model.

Do not make marketplace bidding visibility or customer ratings dependent on subscription tier.

A CRM-only provider should have a clear subscription experience that does not imply marketplace access is required.

Build subscription management separately from job payment processing.

---

# PART 8 — ADMINISTRATION AND PLATFORM CONTROL

## 22. Admin dashboard

Build an administrative area available only to authorized platform administrators.

Administrators should be able to:

- View customers.
- View providers.
- View marketplace jobs.
- View bids.
- View bookings.
- Review reports and complaints.
- Manage service categories.
- Manage service areas.
- Manage platform subscription plans.
- Configure marketplace transaction fees.
- Suspend accounts where appropriate.
- Review verification information.
- Monitor payments and refunds.
- Review platform activity.

Do not allow ordinary providers to access administrator information.

Build an audit log for important administrative actions.

Do not expose private customer information unnecessarily.

---

# PART 9 — DESIGN AND USER EXPERIENCE

## 23. Visual direction

The website should look like a polished, modern technology company.

Avoid an outdated contractor-directory appearance.

Use:

- Clean layouts.
- Professional typography.
- Clear navigation.
- Consistent spacing.
- Modern cards.
- Subtle shadows.
- Professional icons.
- Clear buttons.
- Responsive layouts.
- Strong visual hierarchy.

The design should feel trustworthy and approachable.

Do not make the customer experience feel complicated or corporate.

The customer marketplace should be simple, while the provider dashboard can be more information-rich.

Design separate navigation experiences for customers, providers and administrators.

Use a consistent brand identity throughout the platform.

Create a temporary brand name and logo placeholder that can be replaced later. Do not permanently hardcode a brand identity.

## 24. Mobile-first website

This is a website first, not separate native mobile apps.

It must work well on:

- iPhone browsers.
- Android browsers.
- Desktop browsers.
- Tablets.

Make the customer job-posting process especially easy on mobile.

Make the provider dashboard responsive.

Consider Progressive Web App functionality as a later enhancement.

Do not let PWA functionality delay the core marketplace and CRM features.

---

# PART 10 — TECHNICAL REQUIREMENTS

## 25. Recommended architecture

Use a modern, maintainable web stack.

Preferred starting architecture:

- Next.js with TypeScript.
- React.
- Tailwind CSS.
- Supabase for PostgreSQL database, authentication and file storage.
- Supabase Row Level Security for tenant and role-based data access.
- Stripe Connect for provider payments.
- Stripe Billing for provider subscriptions when subscription pricing is finalized.
- A suitable email service for transactional emails.
- Twilio or another appropriate provider for optional SMS notifications.
- Vercel or another suitable hosting platform.

You may recommend an alternative if there is a compelling technical reason, but explain the trade-offs before changing the architecture.

Use current stable versions and current official documentation.

Do not use deprecated APIs.

## 26. Database design

Design a relational database with appropriate relationships.

At minimum, consider:

- Users.
- Customer profiles.
- Provider profiles.
- Provider business settings.
- Provider service categories.
- Service areas.
- Provider subscriptions.
- Stripe connected accounts.
- Customer records.
- Service requests.
- Job photographs.
- Bids.
- Accepted bookings.
- Conversations.
- Messages.
- Calendar appointments.
- Recurring schedules.
- Jobs.
- Job completion records.
- Change orders.
- Estimates.
- Invoices.
- Payments.
- Payment records.
- Reviews.
- Notifications.
- Employees.
- Employee assignments.
- Administrative actions.
- Support reports.

Important:

- A provider may manage multiple customers.
- A provider's CRM customers must be independent of marketplace customer accounts.
- A marketplace customer may also become a provider's CRM customer after a booking.
- Avoid duplicate customer records when practical.
- Keep customer data separated between provider businesses.
- A provider must never be able to view another provider's customer database.

Use proper foreign keys, indexes and database constraints.

## 27. Security

Security is not optional.

Implement:

- Secure authentication.
- Role-based permissions.
- Row Level Security.
- Server-side authorization.
- Secure image storage.
- Protected administrative routes.
- Stripe webhook signature verification.
- Input validation.
- Rate limiting for sensitive actions.
- Secure password and account recovery workflows.
- Audit logs for important financial and administrative actions.

Never expose secret API keys in frontend code.

Never trust a frontend-only permission check.

A provider must never be able to manipulate another provider's bid, job, customer record or payment.

A customer must never be able to access another customer's private information.

Do not store raw payment card information.

## 28. Notifications

Build a notification system for:

- New marketplace job opportunities.
- New bids.
- Bid acceptance.
- New messages.
- Upcoming appointments.
- Rescheduled appointments.
- Job completion.
- Payment requests.
- Payment confirmations.
- Failed payments.
- Invoice reminders.

Support in-app notifications and transactional email.

SMS should be optional and consent-based.

Do not send SMS messages without the necessary user consent.

---

# PART 11 — BUILDING STRATEGY

## 29. Build in phases

Do not attempt to build everything in one uncontrolled operation.

Build the software in the following stages.

### Phase 1 — Foundation

- Project setup.
- Database architecture.
- Authentication.
- Customer accounts.
- Provider accounts.
- Administrator accounts.
- Provider signup choice.
- CRM-only and Marketplace + CRM entitlements.
- Core design system.
- Responsive navigation.

### Phase 2 — Customer marketplace

- Service categories.
- Job posting.
- Photograph uploads.
- Service-area matching.
- Provider job board.
- Private bids.
- Provider profiles.
- Bid comparison.
- Bid acceptance.
- Private messaging.
- Booking records.

### Phase 3 — Provider CRM

- Customer database.
- Manual customer creation.
- Calendar.
- Recurring appointments.
- Job management.
- Notes and photographs.
- Estimates.
- Invoices.
- Business dashboard.

### Phase 4 — Payments

- Stripe Connect onboarding.
- CRM-only card payments.
- Marketplace completion payments.
- Payment links.
- Webhooks.
- Application fee handling.
- External payment recording.
- Payment history.
- Refund handling.
- Payout status.

Use Stripe test mode until all payment workflows have been tested and reviewed.

### Phase 5 — Advanced business management

- Employee accounts.
- Employee permissions.
- Job assignments.
- Advanced reporting.
- Additional calendar tools.
- Optional route planning.

### Phase 6 — Launch preparation

- Security review.
- Permission testing.
- Mobile testing.
- Payment testing.
- Error handling.
- Performance improvements.
- Privacy and terms pages.
- Support workflows.
- Deployment.
- Production configuration.

Do not mark a phase complete until its functionality has been tested.

---

# PART 12 — RULES FOR CLAUDE CODE

## 30. Important development instructions

You are acting as the lead software architect and developer for this project.

Follow these rules:

1. Treat this document as the authoritative product specification.
2. Do not silently remove, simplify or change an important feature.
3. Do not invent a different business model.
4. Do not make marketplace participation mandatory for CRM users.
5. Do not make customer card entry mandatory during job posting.
6. Do not open private messaging before bid acceptance.
7. Do not expose full customer addresses before a booking is accepted.
8. Do not charge marketplace commissions on CRM-only payments.
9. Do not mark payments complete without verified payment confirmation.
10. Do not use fake data as a substitute for actual working functionality.
11. Clearly identify features that are placeholders or not yet implemented.
12. Use secure database permissions and server-side checks.
13. Write maintainable, organized code.
14. Use reusable components.
15. Keep the application responsive.
16. Write tests for important business logic.
17. Document environment variables and setup instructions.
18. Never commit API secrets or credentials.
19. Never switch Stripe to live mode without explicit approval.
20. Do not deploy publicly or spend money on external services without my approval.

I am the business owner and product decision-maker. I am not an experienced software developer.

Explain important technical decisions in plain English.

When you need to make a technical decision, recommend the best practical option and explain why.

Do not ask me questions about minor implementation details that you can reasonably decide yourself.

Ask me before making changes that would materially affect the business model, customer experience, payment structure or subscription model.

## 31. Required testing

Create tests for the following scenarios:

**Customer marketplace**

- Customer can register.
- Customer can post a job.
- Customer can upload multiple photos.
- Customer can receive bids.
- Customer cannot see other customers' jobs.
- Customer can accept a bid.
- Customer can message only after acceptance.

**Provider CRM**

- CRM-only provider can register.
- CRM-only provider can add outside customers.
- CRM-only provider can create recurring appointments.
- CRM-only provider can create invoices.
- CRM-only provider cannot access marketplace bidding unless enabled.
- Provider can enable marketplace access later.
- Provider cannot access another provider's CRM data.

**Payments**

- Stripe onboarding status is recorded correctly.
- Provider can send a CRM payment request.
- Provider can send a marketplace payment request.
- CRM payments do not receive marketplace commissions.
- Marketplace fees are calculated correctly.
- Failed payments do not show as paid.
- Duplicate webhook events do not duplicate payments.
- External payments are distinguished from Stripe-confirmed payments.

**Security**

- Unauthorized users cannot access protected pages.
- Customers cannot access provider financial information.
- Providers cannot access another provider's private records.
- Administrators have separate permissions.

---

# PART 13 — FIRST INSTRUCTIONS TO CLAUDE CODE

Before writing application code, do the following:

1. Read this entire specification.
2. Inspect the current project directory.
3. Tell me what files and setup already exist.
4. Recommend the exact architecture and technology stack.
5. Create a complete implementation roadmap.
6. Identify external accounts, API keys and services we will eventually need.
7. Design the database schema.
8. Identify any important architectural or payment decisions that need approval.
9. Identify which features can be completed independently and which depend on earlier work.

Do not begin implementing the entire product before presenting the architecture and roadmap.

Once I approve the plan, begin Phase 1.

After each phase:

- Explain what you built.
- List what works.
- List anything incomplete.
- Show me how to test it.
- Identify any decisions that need my approval.
- Keep the project documentation updated.

The end goal is a real, secure, fully functional home-services marketplace and business-management platform—not simply a pretty website.

**Build the product according to this specification. Preserve the business concept and the customer/provider experiences described above.**
