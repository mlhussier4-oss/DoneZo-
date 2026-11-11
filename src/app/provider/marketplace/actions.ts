"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireManager } from "@/lib/auth";
import { parseMoneyToCents } from "@/lib/format";
import { dbErrorMessage, zodErrors, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
type Result = { error?: string };

async function requireMarketplace() {
  const ctx = await requireManager();
  if (!ctx.business.marketplaceEnabled) redirect("/provider/settings?marketplace=off");
  return ctx;
}

// ---------------------------------------------------------------- profile
const profileSchema = z.object({
  homeZip: z.string().regex(/^\d{5}$/, "Enter your 5-digit home ZIP code."),
  radius: z.coerce.number().int().min(1, "At least 1 mile.").max(60, "At most 60 miles."),
  years: z.union([z.literal(""), z.coerce.number().int().min(0).max(100)]),
  description: z.string().trim().max(2000),
  categories: z.array(z.string().uuid()).min(1, "Choose at least one service you offer."),
  methods: z.array(z.enum(["card", "cash", "venmo", "cash_app", "check"])),
});

export async function saveMarketplaceProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { business } = await requireMarketplace();
  const parsed = profileSchema.safeParse({
    homeZip: fd.get("homeZip"),
    radius: fd.get("radius"),
    years: fd.get("years") ?? "",
    description: fd.get("description") ?? "",
    categories: fd.getAll("categories"),
    methods: fd.getAll("methods"),
  });
  if (!parsed.success) return zodErrors(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { data: zip } = await supabase.from("zip_codes").select("zip").eq("zip", v.homeZip).maybeSingle();
  if (!zip) return { status: "error", fieldErrors: { homeZip: "We don't recognize that ZIP code." } };

  const { error } = await supabase
    .from("businesses")
    .update({
      home_zip: v.homeZip,
      service_radius_miles: v.radius,
      years_experience: v.years === "" ? null : v.years,
      description: v.description || null,
      accepted_payment_methods: v.methods,
    })
    .eq("id", business.id);
  if (error) return { status: "error", message: dbErrorMessage(error, "Could not save your profile.") };

  const { data: current } = await supabase.from("provider_categories").select("category_id").eq("business_id", business.id);
  const have = new Set((current ?? []).map((c) => c.category_id));
  const want = new Set(v.categories);
  const remove = [...have].filter((c) => !want.has(c));
  const add = [...want].filter((c) => !have.has(c));
  if (remove.length) await supabase.from("provider_categories").delete().eq("business_id", business.id).in("category_id", remove);
  if (add.length) await supabase.from("provider_categories").insert(add.map((category_id) => ({ business_id: business.id, category_id })));
  refresh();
  return { status: "success", message: "Profile saved. You'll see matching jobs on the job board." };
}

export async function registerBusinessMedia(kind: "logo" | "portfolio", path: string, caption: string): Promise<Result> {
  const { business } = await requireMarketplace();
  if (!path.startsWith(`${business.id}/${kind}-`)) return { error: "Invalid file." };
  const supabase = await createClient();
  if (kind === "logo") {
    const { data: old } = await supabase.from("businesses").select("logo_path").eq("id", business.id).single();
    const { error } = await supabase.from("businesses").update({ logo_path: path }).eq("id", business.id);
    if (error) return { error: "Could not save the logo." };
    if (old?.logo_path) await supabase.storage.from("business-media").remove([old.logo_path]);
  } else {
    const { count } = await supabase.from("portfolio_photos").select("id", { count: "exact", head: true }).eq("business_id", business.id);
    if ((count ?? 0) >= 24) {
      await supabase.storage.from("business-media").remove([path]);
      return { error: "You can show up to 24 portfolio photos." };
    }
    const { error } = await supabase.from("portfolio_photos").insert({ business_id: business.id, storage_path: path, caption: caption.trim().slice(0, 200) || null });
    if (error) return { error: "Could not save the photo." };
  }
  refresh();
  return {};
}

export async function deletePortfolioPhoto(photoId: string): Promise<void> {
  await requireMarketplace();
  if (!uuid.safeParse(photoId).success) return;
  const supabase = await createClient();
  const { data } = await supabase.from("portfolio_photos").select("storage_path").eq("id", photoId).single();
  if (!data) return;
  await supabase.storage.from("business-media").remove([data.storage_path]);
  await supabase.from("portfolio_photos").delete().eq("id", photoId);
  refresh();
}

// ---------------------------------------------------------------- bids
const bidSchema = z.object({
  price: z.string(),
  included: z.string().trim().min(1, "Say what the price includes.").max(2000),
  availability: z.string().trim().min(1, "Say when you could do it.").max(300),
  exclusions: z.string().trim().max(1000),
  // Owner decision 2026-11-12: bids no longer list "possible extra charges".
  message: z.string().trim().max(1000),
});

export async function saveBid(requestId: string, bidId: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { business } = await requireMarketplace();
  if (!uuid.safeParse(requestId).success) return { status: "error", message: "Unknown job." };
  const parsed = bidSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const cents = parseMoneyToCents(parsed.data.price);
  if (!cents || cents < 100) return { status: "error", fieldErrors: { price: "Enter your price, e.g. 85 or 85.50." } };
  const v = parsed.data;
  const cols = {
    price_cents: cents,
    included: v.included,
    availability: v.availability,
    exclusions: v.exclusions || null,
    additional_charges: null,
    message: v.message || null,
  };
  const supabase = await createClient();
  const { error } = bidId
    ? await supabase.from("bids").update(cols).eq("id", bidId)
    : await supabase.from("bids").insert({ ...cols, request_id: requestId, business_id: business.id });
  if (error) return { status: "error", message: dbErrorMessage(error, "Could not send your bid.") };
  refresh();
  return { status: "success", message: bidId ? "Bid updated." : "Bid sent. The customer will be notified." };
}

export async function withdrawBid(bidId: string): Promise<Result> {
  await requireMarketplace();
  if (!uuid.safeParse(bidId).success) return { error: "Unknown bid." };
  const { error } = await (await createClient()).from("bids").update({ status: "withdrawn" }).eq("id", bidId);
  if (error) return { error: dbErrorMessage(error, "Could not withdraw the bid.") };
  refresh();
  return {};
}

// ---------------------------------------------------------------- bookings
export async function proposeChangeOrder(bookingId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireManager();
  if (!uuid.safeParse(bookingId).success) return { status: "error", message: "Unknown booking." };
  const cents = parseMoneyToCents(String(fd.get("price") ?? ""));
  const description = String(fd.get("description") ?? "").trim().slice(0, 2000);
  if (!cents || cents < 100) return { status: "error", fieldErrors: { price: "Enter the new total price." } };
  if (!description) return { status: "error", fieldErrors: { description: "Explain what changed and why." } };
  const { error } = await (await createClient()).from("change_orders").insert({ booking_id: bookingId, new_price_cents: cents, description });
  if (error) {
    return { status: "error", message: error.code === "23505" ? "There's already a change waiting for the customer." : dbErrorMessage(error, "Could not send the change.") };
  }
  refresh();
  return { status: "success", message: "Sent. The price changes only if the customer approves." };
}

export async function withdrawChangeOrder(changeOrderId: string): Promise<Result> {
  await requireManager();
  if (!uuid.safeParse(changeOrderId).success) return { error: "Unknown change." };
  const { error } = await (await createClient()).rpc("withdraw_change_order", { p_change_order_id: changeOrderId });
  if (error) return { error: dbErrorMessage(error, "Could not withdraw the change.") };
  refresh();
  return {};
}

export async function cancelBookingAsProvider(bookingId: string, reason: string): Promise<Result> {
  await requireManager();
  if (!uuid.safeParse(bookingId).success) return { error: "Unknown booking." };
  const { error } = await (await createClient()).rpc("cancel_booking", { p_booking_id: bookingId, p_reason: reason.slice(0, 500) });
  if (error) return { error: dbErrorMessage(error, "Could not cancel this booking.") };
  refresh();
  return {};
}

/**
 * Blueprint §18: the provider finishes a marketplace job and sends the customer a secure payment
 * request. The job waits in "Awaiting payment" until Stripe confirms (then it completes itself),
 * or the provider records a cash/Venmo payment and marks it complete.
 */
export async function completeAndRequestPayment(bookingId: string): Promise<Result & { ok?: boolean }> {
  const { user, business } = await requireManager();
  if (!uuid.safeParse(bookingId).success) return { error: "Unknown booking." };
  const supabase = await createClient();
  const { data: b } = await supabase.from("bookings").select("id, status, job_id, business_id").eq("id", bookingId).single();
  if (!b || b.business_id !== business.id || !b.job_id) return { error: "Unknown booking." };
  if (b.status !== "active") return { error: "This booking isn't active." };

  const { error: jobError } = await supabase.from("jobs").update({ status: "awaiting_payment" }).eq("id", b.job_id);
  if (jobError) return { error: dbErrorMessage(jobError, "Could not update the job.") };

  let { data: inv } = await supabase
    .from("invoices").select("id, number, status, total_cents, amount_paid_cents, public_token")
    .eq("job_id", b.job_id).neq("status", "void").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!inv) {
    const { data: created, error } = await supabase.rpc("create_invoice_for_job", { p_job_id: b.job_id });
    if (error || !created) return { error: dbErrorMessage(error, "Could not create the invoice.") };
    inv = created;
  }
  if (inv!.status === "draft") {
    const { data: sent, error } = await supabase.rpc("send_invoice", { p_invoice_id: inv!.id });
    if (error || !sent) return { error: dbErrorMessage(error, "Could not send the invoice.") };
    inv = sent;
  }
  const balance = inv!.total_cents - inv!.amount_paid_cents;
  const { siteUrl } = await import("@/lib/env");
  const { formatMoney } = await import("@/lib/format");
  const link = siteUrl(`/i/${inv!.public_token}`).toString();

  const { data: acct } = await supabase.from("stripe_accounts").select("stripe_account_id, status").eq("business_id", business.id).maybeSingle();
  const cardsOn = acct?.status === "active" && balance > 0;
  if (cardsOn) {
    try {
      const { getOrCreateInvoiceCheckout } = await import("@/lib/payments/checkout");
      await getOrCreateInvoiceCheckout(
        { invoiceId: inv!.id, businessId: business.id, number: inv!.number, balanceCents: balance, businessName: business.name, stripeAccountId: acct!.stripe_account_id, publicToken: inv!.public_token },
        user.id,
      );
    } catch (err) {
      console.error("checkout for completion failed", err);
      return { error: "The job is marked complete, but we couldn't reach Stripe for the payment link. Try again in a moment." };
    }
  }
  const body = balance > 0
    ? `The job is done! Here's your invoice for ${formatMoney(balance)}: ${link}${cardsOn ? " You can pay securely by card there." : ""}`
    : `The job is done! Your invoice: ${link}`;
  const { error: msgError } = await supabase.from("messages").insert({ booking_id: b.id, body });
  if (msgError) return { error: "The invoice is ready, but the message couldn't be sent." };
  // Text messages (with the customer's consent) are sent once an SMS provider is set up (not configured yet).
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- live booking (owner decision 2026-11-12)
const arrivalSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/) });

/** Confirm a job the customer picked, with the arrival time. The database checks the 5-minute deadline. */
export async function confirmBooking(bookingId: string, date: string, time: string): Promise<Result & { lapsed?: boolean }> {
  const { business } = await requireMarketplace();
  const parsed = arrivalSchema.safeParse({ date, time });
  if (!uuid.safeParse(bookingId).success || !parsed.success) return { error: "Choose the arrival date and time." };
  const { zonedToUtcIso } = await import("@/lib/format");
  const { data, error } = await (await createClient()).rpc("confirm_booking", {
    p_booking_id: bookingId, p_arrival_at: zonedToUtcIso(parsed.data.date, parsed.data.time, business.timezone),
  });
  if (error) return { error: dbErrorMessage(error, "Could not confirm. Please try again.") };
  refresh();
  if (data?.status === "lapsed") return { lapsed: true, error: "Time ran out, so this job went back to the customer." };
  return {};
}

/** Opening the job board clears the red "new jobs" badge. */
export async function markNewJobsSeen(): Promise<void> {
  const { user } = await requireManager();
  await (await createClient()).from("notifications").update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id).eq("kind", "new_request").is("read_at", null);
  refresh();
}

/** Jobs waiting for this business to confirm (alert on every provider page), plus the new-jobs count for the badge. */
export async function pendingConfirmations(): Promise<{ serverNow: string; newJobs: number; items: { id: string; confirmBy: string; label: string }[] }> {
  const { user, business } = await requireManager();
  const { count: newJobs } = await (await createClient()).from("notifications").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("kind", "new_request").is("read_at", null);
  const { data } = await (await createClient())
    .from("bookings")
    .select("id, confirm_by, agreed_price_cents, service_requests(zip, service_categories(name))")
    .eq("business_id", business.id).eq("status", "pending").order("confirm_by");
  return {
    serverNow: new Date().toISOString(),
    newJobs: newJobs ?? 0,
    items: (data ?? []).map((b) => ({
      id: b.id,
      confirmBy: b.confirm_by!,
      label: `${b.service_requests?.service_categories?.name ?? "Job"} in ${b.service_requests?.zip ?? ""} · $${(b.agreed_price_cents / 100).toFixed(2)}`,
    })),
  };
}
