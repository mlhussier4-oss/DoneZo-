import "server-only";
import { addDays, addMonths, isIsoDate, startOfMonth } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type Report = {
  from: string; to: string; today: string; unit: "day" | "week" | "month";
  summary: {
    gross_cents: number; refunded_cents: number; net_cents: number; card_cents: number; recorded_cents: number; fee_cents: number;
    payments: number; completed_jobs: number; completed_value_cents: number; average_job_cents: number; new_customers: number; invoiced_cents: number;
  };
  series: { period: string; cents: number }[];
  by_method: { method: string; cents: number; count: number }[];
  by_service: { name: string; cents: number }[];
  by_employee: { user_id: string | null; name: string; jobs: number; value_cents: number }[];
  top_customers: { id: string; name: string; cents: number; payments: number }[];
  aging: Record<"current_cents" | "current_count" | "d1_30_cents" | "d1_30_count" | "d31_60_cents" | "d31_60_count" | "d61_cents" | "d61_count", number>;
  overdue: { id: string; number: number; customer: string; balance_cents: number; days_late: number }[];
};

export const rangePresets = [
  { value: "month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "30d", label: "Last 30 days" },
  { value: "quarter", label: "Last 3 months" },
  { value: "year", label: "This year" },
] as const;

/** Resolve ?range= / ?from=&to= into an inclusive date range (business-local dates). */
export function resolveRange(params: Record<string, string | string[] | undefined>, today: string) {
  if (isIsoDate(params.from) && isIsoDate(params.to) && params.from <= params.to) {
    return { preset: "custom" as const, from: params.from, to: params.to };
  }
  const preset = rangePresets.find((p) => p.value === params.range)?.value ?? "month";
  const month = startOfMonth(today);
  switch (preset) {
    case "last-month": return { preset, from: addMonths(month, -1), to: addDays(month, -1) };
    case "30d": return { preset, from: addDays(today, -29), to: today };
    case "quarter": return { preset, from: addMonths(month, -2), to: today };
    case "year": return { preset, from: `${today.slice(0, 4)}-01-01`, to: today };
    default: return { preset, from: month, to: today };
  }
}

export async function getReport(businessId: string, from: string, to: string): Promise<{ report: Report | null; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("business_report", { p_business_id: businessId, p_from: from, p_to: to });
  if (error) return { report: null, error: error.code === "22023" ? error.message : "Could not load this report." };
  return { report: data as unknown as Report };
}

/** One CSV cell: quoted, and protected against spreadsheet formula injection. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r']/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
