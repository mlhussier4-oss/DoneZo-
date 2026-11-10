"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireProvider } from "@/lib/auth";
import { parseMoneyToCents } from "@/lib/format";
import { dbErrorMessage, zodErrors, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
type Result = { error?: string };

async function requireMarketplace() {
  const ctx = await requireProvider();
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
  additionalCharges: z.string().trim().max(1000),
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
    additional_charges: v.additionalCharges || null,
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
  await requireProvider();
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
  await requireProvider();
  if (!uuid.safeParse(changeOrderId).success) return { error: "Unknown change." };
  const { error } = await (await createClient()).rpc("withdraw_change_order", { p_change_order_id: changeOrderId });
  if (error) return { error: dbErrorMessage(error, "Could not withdraw the change.") };
  refresh();
  return {};
}

export async function cancelBookingAsProvider(bookingId: string, reason: string): Promise<Result> {
  await requireProvider();
  if (!uuid.safeParse(bookingId).success) return { error: "Unknown booking." };
  const { error } = await (await createClient()).rpc("cancel_booking", { p_booking_id: bookingId, p_reason: reason.slice(0, 500) });
  if (error) return { error: dbErrorMessage(error, "Could not cancel this booking.") };
  refresh();
  return {};
}
