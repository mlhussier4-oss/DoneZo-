"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
type Result = { error?: string };

export async function acceptBid(bidId: string): Promise<Result> {
  await requireRole("customer");
  if (!uuid.safeParse(bidId).success) return { error: "Unknown bid." };
  const { error } = await (await createClient()).rpc("accept_bid", { p_bid_id: bidId });
  if (error) return { error: dbErrorMessage(error, "Could not accept this bid. Please try again.") };
  refresh();
  return {};
}

export async function cancelRequest(requestId: string): Promise<Result> {
  await requireRole("customer");
  if (!uuid.safeParse(requestId).success) return { error: "Unknown request." };
  const { error } = await (await createClient()).rpc("cancel_request", { p_request_id: requestId });
  if (error) return { error: dbErrorMessage(error, "Could not cancel this request.") };
  refresh();
  return {};
}

export async function cancelBookingAsCustomer(bookingId: string, reason: string): Promise<Result> {
  await requireRole("customer");
  if (!uuid.safeParse(bookingId).success) return { error: "Unknown booking." };
  const { error } = await (await createClient()).rpc("cancel_booking", { p_booking_id: bookingId, p_reason: reason.slice(0, 500) });
  if (error) return { error: dbErrorMessage(error, "Could not cancel this booking.") };
  refresh();
  return {};
}

export async function decideChangeOrder(changeOrderId: string, approve: boolean): Promise<Result> {
  await requireRole("customer");
  if (!uuid.safeParse(changeOrderId).success) return { error: "Unknown change." };
  const { error } = await (await createClient()).rpc("decide_change_order", { p_change_order_id: changeOrderId, p_approve: approve });
  if (error) return { error: dbErrorMessage(error, "Could not record your decision.") };
  refresh();
  return {};
}

export async function submitReview(bookingId: string, rating: number, comment: string): Promise<Result> {
  await requireRole("customer");
  if (!uuid.safeParse(bookingId).success || !Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose 1 to 5 stars." };
  const supabase = await createClient();
  const { data: booking } = await supabase.from("bookings").select("business_id").eq("id", bookingId).single();
  if (!booking) return { error: "Unknown booking." };
  // business_id is re-derived from the booking by the database; it can't be pointed elsewhere.
  const { error } = await supabase
    .from("reviews")
    .insert({ booking_id: bookingId, business_id: booking.business_id, rating, comment: comment.trim().slice(0, 2000) || null });
  if (error) return { error: dbErrorMessage(error, "Could not save your review.") };
  refresh();
  return {};
}
