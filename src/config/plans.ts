/**
 * What each provider plan includes, for display (owner decision 2026-11-11).
 * Prices live in the database (plans.price_cents) and Stripe; the database enforces what each plan can do.
 */
export type PlanCode = "basic" | "pro";

export const planInfo: Record<PlanCode, { name: string; price: string; tagline: string; features: string[] }> = {
  basic: {
    name: "DoneZo Basic",
    price: "$9.99",
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
    name: "DoneZo Pro",
    price: "$19.99",
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
};

export const cardFeeNote = "DoneZo keeps 10% of card payments your customers make through DoneZo (both plans). No fee on cash, Venmo, Cash App or check.";
