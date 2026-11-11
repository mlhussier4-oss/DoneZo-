import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secretKey = () => process.env.SUPABASE_SECRET_KEY!;

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service-role client: bypasses RLS. Used only to set up test data. */
export function adminClient(): SupabaseClient {
  return createClient(url(), secretKey(), noSession);
}

/** Client with no login (the public). */
export function anonClient(): SupabaseClient {
  return createClient(url(), anonKey(), noSession);
}

export type TestUser = { id: string; email: string; client: SupabaseClient };

/**
 * Creates a confirmed user through the normal sign-up trigger, then signs in
 * as them, returning a client that is subject to RLS like a real browser.
 * Providers get an active subscription (as if they had paid) unless `subscribed: false`.
 */
export async function createUser(metadata: Record<string, unknown>, opts: { subscribed?: boolean } = {}): Promise<TestUser> {
  const email = `test-${randomUUID()}@example.com`;
  const password = `Pw-${randomUUID()}`;
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;

  if (metadata.role === "provider" && opts.subscribed !== false) {
    await activateSubscription(await businessIdFor(data.user.id));
  }

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client };
}

/** Marks a business's subscription active, as the Stripe webhook does after a successful payment. */
export async function activateSubscription(businessId: string, status = "active") {
  const { error } = await adminClient()
    .from("business_subscriptions")
    .upsert({ business_id: businessId, status, stripe_customer_id: `cus_test_${businessId.slice(0, 8)}`, stripe_subscription_id: `sub_test_${businessId.slice(0, 8)}` });
  if (error) throw error;
}

export async function createAdmin(): Promise<TestUser> {
  const user = await createUser({ role: "customer", full_name: "Test Admin" });
  const { error } = await adminClient().from("profiles").update({ role: "admin" }).eq("id", user.id);
  if (error) throw error;
  return user;
}

export async function businessIdFor(userId: string): Promise<string> {
  const { data, error } = await adminClient()
    .from("business_members")
    .select("business_id")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data.business_id;
}
