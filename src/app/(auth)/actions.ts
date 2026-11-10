"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { homePathFor, safeNextPath, type AppRole } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type FormState = {
  status: "idle" | "error" | "success" | "verify";
  message?: string;
  fieldErrors?: Record<string, string>;
  email?: string;
};

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);
const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use 72 characters or fewer.");

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Send a freshly signed-in user to their own area (uses the client that holds the new session). */
async function redirectAfterSignIn(supabase: ServerClient, userId: string | undefined, next: unknown): Promise<never> {
  let role: AppRole = "customer";
  if (userId) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
    if (profile?.role) role = profile.role as AppRole;
  }
  const safeNext = safeNextPath(next);
  // Only follow "next" when it is inside the user's own area (or a neutral page).
  const home = homePathFor(role);
  const allowed = safeNext && (safeNext.startsWith(home) || safeNext.startsWith("/account") || safeNext === "/");
  redirect(allowed ? safeNext : home);
}

// ---------------------------------------------------------------------------
// Provider sign-up (email + password). Creates the business via a database trigger.
// ---------------------------------------------------------------------------
const providerSignUpSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(120),
  businessName: z.string().trim().min(1, "Enter your business name.").max(120),
  email,
  password,
  usage: z.enum(["crm", "marketplace"], { message: "Choose how you'd like to use DoneZo." }),
});

export async function providerSignUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = providerSignUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  const { fullName, businessName, email, password, usage } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${publicEnv.siteUrl()}/auth/confirm?next=/provider`,
      data: {
        role: "provider",
        full_name: fullName,
        business_name: businessName,
        marketplace_enabled: usage === "marketplace",
      },
    },
  });
  if (error) {
    return { status: "error", message: friendlyAuthError(error.message) };
  }
  // For privacy, the same message is shown whether or not the email was already registered.
  return { status: "success", email };
}

// ---------------------------------------------------------------------------
// Password sign-in (providers and admins)
// ---------------------------------------------------------------------------
const passwordSignInSchema = z.object({ email, password: z.string().min(1, "Enter your password.") });

export async function passwordSignIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = passwordSignInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: friendlyAuthError(error.message) };
  return redirectAfterSignIn(supabase, data.user?.id, formData.get("next"));
}

// ---------------------------------------------------------------------------
// Email code sign-in / sign-up (customers). No password.
// ---------------------------------------------------------------------------
const sendCodeSchema = z.object({
  email,
  fullName: z.string().trim().max(120).optional(),
});

export async function sendEmailCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = sendCodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      // Only applied when this creates a new account; role is re-checked by the database.
      data: { role: "customer", full_name: parsed.data.fullName || null },
      emailRedirectTo: `${publicEnv.siteUrl()}/auth/confirm?next=/customer`,
    },
  });
  if (error) return { status: "error", message: friendlyAuthError(error.message), email: parsed.data.email };
  return { status: "verify", email: parsed.data.email };
}

const verifyCodeSchema = z.object({
  email,
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});

export async function verifyEmailCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = verifyCodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "verify", email: String(formData.get("email") ?? ""), fieldErrors: fieldErrors(parsed.error) };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ ...parsed.data, type: "email" });
  if (error) {
    return { status: "verify", email: parsed.data.email, message: "That code is incorrect or has expired. Try again or request a new code." };
  }
  return redirectAfterSignIn(supabase, data.user?.id, formData.get("next"));
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------
export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.object({ email }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl()}/auth/confirm?next=/account/update-password`,
  });
  // Always report success so this form can't be used to discover which emails have accounts.
  return { status: "success", email: parsed.data.email };
}

const updatePasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "The passwords don't match.", path: ["confirm"] });

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = updatePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: friendlyAuthError(error.message) };
  return redirectAfterSignIn(supabase, data.user?.id, null);
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Please try again.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox for the confirmation message.";
  if (m.includes("rate limit") || m.includes("security purposes")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("weak") || m.includes("password")) return message;
  return "Something went wrong. Please try again.";
}
