import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProviderSignupForm } from "./provider-signup-form";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Provider sign up" };

async function FormWithPreselection({ searchParams }: { searchParams: PageProps<"/signup/provider">["searchParams"] }) {
  const { plan, ref } = await searchParams;
  const initial = plan === "basic" || plan === "crm" || plan === "marketplace" ? plan : null;
  // Referral link (owner decision 2026-11-14): /signup/provider?ref=CODE
  const code = typeof ref === "string" && /^[A-Za-z0-9]{4,12}$/.test(ref) ? ref.toUpperCase() : undefined;
  const referrer = code ? (await createPublicClient().rpc("referrer_name", { p_code: code })).data : null;
  return <ProviderSignupForm initialUsage={initial} referralCode={referrer ? code : undefined} referrerName={referrer ?? undefined} />;
}

export default function ProviderSignupPage({ searchParams }: PageProps<"/signup/provider">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-2xl">Set up your business</CardTitle>
        <CardDescription><span className="ios-app:hidden">HomeHire Basic $9.99/month for the marketplace, or HomeHire Pro $19.99/month with business tools. You&apos;ll subscribe after confirming your email.</span><span className="hidden ios-app:inline">Create your business account. You&apos;ll choose your plan on the HomeHire website (homehire.us) after confirming your email.</span></CardDescription>
      </CardHeader>
      <CardContent>
        {/* How jobs work, so pros know what to expect (owner request 2026-11-14). */}
        <div className="mb-6 rounded-lg bg-muted/60 p-4 text-sm" data-testid="provider-how-it-works">
          <p className="mb-2 font-semibold">How jobs work on HomeHire</p>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Get an alert when a homeowner near you posts a job with photos.</li>
            <li>Send a sealed bid with your price. Other pros never see it.</li>
            <li>If the homeowner picks you, confirm the job and your arrival time within 5 minutes.</li>
            <li><strong className="text-foreground">Once you confirm, a private chat with the customer opens automatically</strong>, where they send you their address and you sort out the details.</li>
          </ol>
        </div>
        <Suspense fallback={<div className="h-96" />}>
          <FormWithPreselection searchParams={searchParams} />
        </Suspense>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login?next=/provider" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
