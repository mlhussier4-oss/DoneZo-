export type Stats = { rating: number | null; review_count: number; completed_jobs: number };

export type BidCardData = {
  id: string;
  status: "submitted" | "accepted";
  price_cents: number;
  included: string;
  availability: string;
  exclusions: string | null;
  additional_charges: string | null;
  message: string | null;
  created_at: string;
  business: {
    id: string;
    name: string;
    logo_path: string | null;
    years_experience: number | null;
    verified: boolean;
    accepted_payment_methods: string[];
    portfolio: string[];
    stats: Stats;
  };
};

export type CustomerBooking = {
  id: string;
  status: "pending" | "active" | "completed" | "canceled";
  agreed_price_cents: number;
  original_price_cents: number;
  scope: string;
  created_at: string;
  completed_at: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
  /** Live booking: the provider must confirm before this time. */
  confirm_by: string | null;
  confirmed_at: string | null;
  arrival_at: string | null;
  extensions: number;
  /** Server time when this was read, to keep the countdown in step with the database's clock. */
  server_now: string;
  business: { id: string; name: string; phone: string | null; email: string | null; logo_path: string | null; accepted_payment_methods: string[] };
  job: { status: string; scheduled_start: string | null; scheduled_end: string | null } | null;
  invoices: { number: number; status: string; total_cents: number; amount_paid_cents: number; token: string }[];
  change_orders: { id: string; new_price_cents: number; description: string; status: string; created_at: string }[];
  review: { rating: number; comment: string | null } | null;
};

export type ProviderProfile = {
  id: string;
  name: string;
  description: string | null;
  years_experience: number | null;
  home_zip: string | null;
  service_radius_miles: number;
  accepted_payment_methods: string[];
  logo_path: string | null;
  verified: boolean;
  categories: string[];
  portfolio: { path: string; caption: string | null }[];
  reviews: { rating: number; comment: string | null; created_at: string; author: string }[];
  stats: Stats;
};
