/**
 * What each provider plan includes, for display (owner decisions 2026-11-11 and 2026-11-21).
 * Prices live in the database (plans.price_cents) and Stripe; the database enforces what each plan can do.
 */
export const PLAN_CODES = ["basic", "pro", "priority"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];
export const isPlanCode = (v: unknown): v is PlanCode => PLAN_CODES.includes(v as PlanCode);
/** Lowest to highest, for "upgrade" vs "switch" wording. */
export const planRank: Record<PlanCode, number> = { basic: 1, pro: 2, priority: 3 };

/** The head start HomeHire Priority pros get on new jobs (owner decision 2026-11-21). */
export const HEAD_START_MINUTES = 5;

/** `yearly: null` = monthly only. */
export const planInfo: Record<PlanCode, { name: string; price: string; yearly: string | null; tagline: string; features: string[] }> = {
  basic: {
    name: "HomeHire Basic",
    price: "$9.99",
    yearly: "$99.90",
    tagline: "The marketplace: find local jobs, bid, and get paid.",
    features: [
      "Public profile with reviews and portfolio",
      "Local job requests in your area and services",
      "Sealed bids: no fees per lead",
      "Messages, photos and scheduling for the jobs you win",
      "Card payments for marketplace jobs, paid out to your bank",
      "A calendar of your marketplace jobs",
    ],
  },
  pro: {
    name: "HomeHire Pro",
    price: "$19.99",
    yearly: "$199.90",
    tagline: "The marketplace plus business tools for all your customers.",
    features: [
      "Everything in Basic (or keep the marketplace switched off)",
      "Customer database with notes, photos and history",
      "Recurring visits, jobs, estimates and invoices for your own customers",
      "Record cash, Venmo, Cash App and check payments",
      "Reports, CSV export and route planning",
      "Team members: employees and managers",
    ],
  },
  priority: {
    name: "HomeHire Priority",
    price: "$39.99",
    yearly: null,
    tagline: "Everything in Pro, plus first look at every new job near you.",
    features: [
      "Everything in Pro: marketplace plus all business tools",
      "5-minute head start: see and bid on new jobs in your area before other pros",
      "Bid during your head start and yours is among the first bids the customer sees",
      "Instant alert on every new job: \"You have a 5-minute head start on your bid!\"",
    ],
  },
};

/** Owner decision 2026-11-15: HomeHire Basic's first month is free (once per business). Pro is charged from the start. */
export const FREE_TRIAL_DAYS = 30;
export const FREE_MONTH_PLAN = "basic" as const;
/** When a free month started now ends, i.e. the date of the first charge. */
export const freeMonthEndsAt = (): Date => new Date(Date.now() + FREE_TRIAL_DAYS * 86_400_000);
export const freeMonthNote = "HomeHire Basic: first month free, then $9.99/month. Cancel any time.";

export const cardFeeNote = "HomeHire keeps 10% of card payments your customers make through HomeHire (all plans). No fee on cash, Venmo, Cash App or check.";
