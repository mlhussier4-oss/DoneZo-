import { requireManager } from "@/lib/auth";
import { paymentMethodLabel } from "@/lib/crm/labels";
import { csvCell, resolveRange } from "@/lib/crm/report";
import { localDateKey } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const dollars = (cents: number) => (cents / 100).toFixed(2);

/** Download every payment in the chosen range as a spreadsheet-friendly CSV file. */
export async function GET(request: Request) {
  const { business } = await requireManager();
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const { from, to } = resolveRange(params, localDateKey(new Date(), business.timezone));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("business_report_payments", { p_business_id: business.id, p_from: from, p_to: to });
  if (error) return new Response("Could not build the report.", { status: 400 });

  const header = ["Date", "Customer", "Invoice", "Job", "Method", "Confirmation", "Amount", "Refunded", "Net", "DoneZo fee", "Note"];
  const lines = (data ?? []).map((r) => [
    r.received_on, r.customer, r.invoice_number ? `#${r.invoice_number}` : "", r.job_title ?? "",
    paymentMethodLabel(r.method), r.verification === "stripe_verified" ? "Verified by Stripe" : "Recorded by you",
    dollars(r.amount_cents), dollars(r.refunded_cents), dollars(r.amount_cents - r.refunded_cents), dollars(r.fee_cents), r.note ?? "",
  ].map(csvCell).join(","));
  const body = "﻿" + [header.join(","), ...lines].join("\r\n") + "\r\n";
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="donezo-payments-${from}-to-${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
