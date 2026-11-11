import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Dashboard = {
  today: string;
  revenue_month_cents: number;
  revenue_week_cents: number;
  completed_jobs_month: number;
  upcoming_jobs_7d: number;
  new_customers_month: number;
  active_customers: number;
  repeat_customers: number;
  outstanding_invoices: number;
  outstanding_cents: number;
  average_job_cents: number;
  revenue_by_category: { name: string; cents: number }[];
  revenue_by_month: { month: string; cents: number }[];
};

/** Live figures for one business, calculated by the database in the business's time zone. */
export async function getDashboard(businessId: string): Promise<Dashboard> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("business_dashboard", { p_business_id: businessId });
  if (error || !data) throw new Error("Could not load your dashboard figures.");
  return data as unknown as Dashboard;
}
