import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProviderSignupForm } from "./provider-signup-form";

export const metadata: Metadata = { title: "Provider sign up" };

async function FormWithPreselection({ searchParams }: { searchParams: PageProps<"/signup/provider">["searchParams"] }) {
  const { plan } = await searchParams;
  const initial = plan === "crm" ? "crm" : plan === "marketplace" ? "marketplace" : null;
  return <ProviderSignupForm initialUsage={initial} />;
}

export default function ProviderSignupPage({ searchParams }: PageProps<"/signup/provider">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-2xl">Set up your business</CardTitle>
        <CardDescription>$9.99/month for everything. You&apos;ll subscribe after confirming your email.</CardDescription>
      </CardHeader>
      <CardContent>
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
