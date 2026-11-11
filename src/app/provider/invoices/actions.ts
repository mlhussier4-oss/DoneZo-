"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireManager } from "@/lib/auth";
import { uuid } from "@/lib/crm/schemas";
import { parseMoneyToCents, parsePercentToBps } from "@/lib/format";
import { dbErrorMessage, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const lineSchema = z.object({
  description: z.string().trim().min(1, "Each line needs a description.").max(500),
  quantity: z.coerce.number().positive("Quantity must be more than 0.").max(100000),
  unitPrice: z.string(),
  taxable: z.boolean(),
});

const docSchema = z.object({
  kind: z.enum(["invoice", "estimate"]),
  customerId: z.string().uuid("Choose a customer."),
  jobId: z.union([z.literal(""), z.string().uuid()]).transform((v) => v || null),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  dueDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).transform((v) => v || null),
  taxPercent: z.string(),
  notes: z.string().trim().max(5000).transform((v) => v || null),
  lines: z.array(lineSchema).min(1, "Add at least one line."),
});

function parse(fd: FormData) {
  let lines: unknown = [];
  try {
    lines = JSON.parse(String(fd.get("lines") ?? "[]"));
  } catch {
    lines = [];
  }
  const raw = { ...Object.fromEntries(fd), lines };
  const result = docSchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    return { error: { status: "error", message: first?.message ?? "Check the form." } satisfies ActionState };
  }
  const v = result.data;
  const taxBps = parsePercentToBps(v.taxPercent);
  if (taxBps === null) return { error: { status: "error", message: "Enter a tax rate like 8.25 (or leave it empty)." } satisfies ActionState };
  const lineRows = [];
  for (const [i, l] of v.lines.entries()) {
    const cents = parseMoneyToCents(l.unitPrice || "0");
    if (cents === null) return { error: { status: "error", message: `Line ${i + 1}: enter a price like 45 or 45.50.` } satisfies ActionState };
    lineRows.push({ position: i, description: l.description, quantity: Math.round(l.quantity * 100) / 100, unit_price_cents: cents, taxable: l.taxable });
  }
  return { value: { ...v, taxBps, lineRows } };
}

export async function saveDocument(documentId: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { business } = await requireManager();
  const parsed = parse(fd);
  if ("error" in parsed) return parsed.error!;
  const v = parsed.value;
  const supabase = await createClient();
  const table = v.kind === "invoice" ? "invoices" : "estimates";
  const common = { issue_date: v.issueDate, notes: v.notes, tax_rate_bps: v.taxBps };

  let id = documentId;
  if (id) {
    if (!uuid.safeParse(id).success) return { status: "error", message: "Unknown document." };
    const { error } =
      v.kind === "invoice"
        ? await supabase.from("invoices").update({ ...common, due_date: v.dueDate }).eq("id", id)
        : await supabase.from("estimates").update({ ...common, valid_until: v.dueDate }).eq("id", id);
    if (error) return { status: "error", message: dbErrorMessage(error, "Could not save.") };
  } else {
    const base = { ...common, business_id: business.id, customer_id: v.customerId, job_id: v.jobId };
    const { data, error } =
      v.kind === "invoice"
        ? await supabase.from("invoices").insert({ ...base, due_date: v.dueDate }).select("id").single()
        : await supabase.from("estimates").insert({ ...base, valid_until: v.dueDate }).select("id").single();
    if (error || !data) return { status: "error", message: dbErrorMessage(error, "Could not create. Check the customer.") };
    id = data.id;
  }
  // Lines are replaced in one all-or-nothing database step.
  const { error: lineError } = await supabase.rpc("replace_document_lines", {
    p_kind: v.kind,
    p_document_id: id!,
    p_lines: v.lineRows,
  });
  if (lineError) {
    if (!documentId) await supabase.from(table).delete().eq("id", id!);
    return { status: "error", message: dbErrorMessage(lineError, "Could not save the line items.") };
  }
  redirect(`/provider/${v.kind === "invoice" ? "invoices" : "estimates"}/${id}`);
}

type Result = { error?: string };

export async function sendInvoice(invoiceId: string): Promise<Result> {
  await requireManager();
  if (!uuid.safeParse(invoiceId).success) return { error: "Unknown invoice." };
  const { error } = await (await createClient()).rpc("send_invoice", { p_invoice_id: invoiceId });
  if (error) return { error: dbErrorMessage(error, "Could not mark the invoice as sent.") };
  refresh();
  return {};
}

export async function voidInvoice(invoiceId: string): Promise<Result> {
  await requireManager();
  if (!uuid.safeParse(invoiceId).success) return { error: "Unknown invoice." };
  const { error } = await (await createClient()).rpc("void_invoice", { p_invoice_id: invoiceId });
  if (error) return { error: dbErrorMessage(error, "Could not void the invoice.") };
  refresh();
  return {};
}

export async function deleteDraft(kind: "invoice" | "estimate", id: string): Promise<Result> {
  await requireManager();
  if (!uuid.safeParse(id).success) return { error: "Unknown document." };
  const supabase = await createClient();
  const { data, error } = await supabase.from(kind === "invoice" ? "invoices" : "estimates").delete().eq("id", id).select("id");
  if (error || !data?.length) return { error: "Only drafts can be deleted." };
  redirect(`/provider/invoices${kind === "estimate" ? "?tab=estimates" : ""}`);
}

export async function setEstimateStatus(estimateId: string, status: "sent" | "accepted" | "declined"): Promise<Result> {
  await requireManager();
  if (!uuid.safeParse(estimateId).success) return { error: "Unknown estimate." };
  const { error } = await (await createClient()).rpc("set_estimate_status", { p_estimate_id: estimateId, p_status: status });
  if (error) return { error: dbErrorMessage(error, "Could not update the estimate.") };
  refresh();
  return {};
}

export async function convertEstimate(estimateId: string): Promise<Result> {
  await requireManager();
  if (!uuid.safeParse(estimateId).success) return { error: "Unknown estimate." };
  const { data, error } = await (await createClient()).rpc("convert_estimate_to_invoice", { p_estimate_id: estimateId });
  if (error || !data) return { error: dbErrorMessage(error, "Could not create the invoice.") };
  redirect(`/provider/invoices/${data.id}`);
}

const paymentSchema = z.object({
  amount: z.string(),
  method: z.enum(["cash", "venmo", "cash_app", "check", "other"], { message: "Choose how you were paid." }),
  receivedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  note: z.string().trim().max(1000).transform((v) => v || null),
});

export async function recordPayment(invoiceId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireManager();
  if (!uuid.safeParse(invoiceId).success) return { status: "error", message: "Unknown invoice." };
  const parsed = paymentSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const cents = parseMoneyToCents(parsed.data.amount);
  if (!cents) return { status: "error", message: "Enter an amount like 45 or 45.50." };
  const supabase = await createClient();
  const { data: inv } = await supabase.from("invoices").select("business_id, customer_id, job_id, total_cents, amount_paid_cents").eq("id", invoiceId).single();
  if (!inv) return { status: "error", message: "Unknown invoice." };
  if (cents > inv.total_cents - inv.amount_paid_cents) {
    return { status: "error", message: "That's more than the balance due." };
  }
  const { error } = await supabase.from("payment_records").insert({
    business_id: inv.business_id,
    customer_id: inv.customer_id,
    invoice_id: invoiceId,
    job_id: inv.job_id,
    amount_cents: cents,
    method: parsed.data.method,
    received_on: parsed.data.receivedOn,
    note: parsed.data.note,
  });
  if (error) return { status: "error", message: dbErrorMessage(error, "Could not record the payment.") };
  refresh();
  return { status: "success", message: "Payment recorded." };
}

export async function deletePayment(paymentId: string): Promise<Result> {
  await requireManager();
  if (!uuid.safeParse(paymentId).success) return { error: "Unknown payment." };
  const { error } = await (await createClient()).from("payment_records").delete().eq("id", paymentId);
  if (error) return { error: dbErrorMessage(error, "Could not delete the payment.") };
  refresh();
  return {};
}

/** Create (or reuse) a Stripe card payment link for the invoice's balance. */
export async function createCardPaymentLink(invoiceId: string): Promise<{ url?: string; error?: string }> {
  const { user, business } = await requireManager();
  if (!uuid.safeParse(invoiceId).success) return { error: "Unknown invoice." };
  const supabase = await createClient();
  const [{ data: inv }, { data: acct }] = await Promise.all([
    supabase.from("invoices").select("id, business_id, number, status, total_cents, amount_paid_cents, public_token").eq("id", invoiceId).single(),
    supabase.from("stripe_accounts").select("stripe_account_id, status").eq("business_id", business.id).maybeSingle(),
  ]);
  if (!inv || inv.business_id !== business.id) return { error: "Unknown invoice." };
  if (!["sent", "partially_paid"].includes(inv.status)) return { error: "Mark the invoice as sent first." };
  if (!acct || acct.status !== "active") return { error: "Connect Stripe on the Payments page to take card payments." };
  try {
    const { getOrCreateInvoiceCheckout } = await import("@/lib/payments/checkout");
    const url = await getOrCreateInvoiceCheckout(
      {
        invoiceId: inv.id,
        businessId: business.id,
        number: inv.number,
        balanceCents: inv.total_cents - inv.amount_paid_cents,
        businessName: business.name,
        stripeAccountId: acct.stripe_account_id,
        publicToken: inv.public_token,
      },
      user.id,
    );
    refresh();
    return { url };
  } catch (err) {
    console.error("card link failed", err);
    return { error: "We couldn't reach Stripe. Please try again." };
  }
}
