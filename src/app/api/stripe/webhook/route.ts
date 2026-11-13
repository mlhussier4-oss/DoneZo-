import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { liveModeAllowed, stripe } from "@/lib/stripe/server";
import { syncStripeAccount, syncSubscription } from "@/lib/stripe/sync";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Stripe webhook endpoint.
 *  1. The signature is verified with the endpoint secret(s); anything else is rejected.
 *  2. Each event id is stored once; a duplicate delivery is acknowledged and ignored.
 *  3. Only then does HomeHire change payment or subscription status.
 * Two endpoints can point here: one for the platform account (subscriptions) and one for
 * connected accounts (providers' card payments, refunds, account updates).
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean) as string[];
  if (!signature || !secrets.length) return NextResponse.json({ error: "Not configured" }, { status: 400 });

  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = stripe().webhooks.constructEvent(body, signature, secret);
      break;
    } catch {
      // try the next secret
    }
  }
  if (!event) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  if (event.livemode && !liveModeAllowed()) return NextResponse.json({ error: "Live events are not accepted" }, { status: 400 });

  const db = createServiceClient();
  const { error: insertError } = await db
    .from("stripe_events")
    .insert({ id: event.id, type: event.type, account: event.account ?? null, livemode: event.livemode });
  if (insertError) {
    if (insertError.code !== "23505") return NextResponse.json({ error: "Could not record event" }, { status: 500 });
    const { data: seen } = await db.from("stripe_events").select("processed_at").eq("id", event.id).single();
    if (seen?.processed_at) return NextResponse.json({ received: true, duplicate: true });
    // A previous attempt failed part-way; process again (every step below is idempotent).
  }

  try {
    await handle(event);
    await db.from("stripe_events").update({ processed_at: new Date().toISOString(), error: null }).eq("id", event.id);
    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.from("stripe_events").update({ error: message.slice(0, 1000) }).eq("id", event.id);
    console.error(`Stripe webhook ${event.type} ${event.id} failed:`, message);
    // 500 tells Stripe to retry later.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function handle(event: Stripe.Event) {
  const db = createServiceClient();
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription") {
        if (session.subscription) {
          const sub = typeof session.subscription === "string" ? await stripe().subscriptions.retrieve(session.subscription) : session.subscription;
          await syncSubscription(sub);
        }
        return;
      }
      if (session.mode === "payment" && session.payment_status === "paid") {
        const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        if (!pi) throw new Error("Paid session without a payment intent");
        const { error } = await db.rpc("stripe_record_checkout_paid", {
          p_checkout_session_id: session.id,
          p_payment_intent_id: pi,
          p_charge_id: null as unknown as string,
          p_amount_cents: session.amount_total ?? 0,
        });
        if (error) throw new Error(error.message);
      }
      return;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await db.rpc("stripe_mark_payment_request", { p_checkout_session_id: session.id, p_status: "failed", p_message: "The payment didn't go through." });
      return;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await db.rpc("stripe_mark_payment_request", { p_checkout_session_id: session.id, p_status: "expired", p_message: "The payment link expired." });
      return;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (pi) {
        const { error } = await db.rpc("stripe_record_refund", { p_payment_intent_id: pi, p_refunded_total_cents: charge.amount_refunded });
        if (error) throw new Error(error.message);
      }
      return;
    }
    case "account.updated": {
      await syncStripeAccount(event.data.object as Stripe.Account);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object as Stripe.Subscription);
      return;
    }
    default:
      return; // not used by HomeHire
  }
}
