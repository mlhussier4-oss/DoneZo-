import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerBenefits } from "@/components/marketing/customer-benefits";
import { safeNextPath } from "@/lib/auth";
import { CustomerSignupForm } from "./customer-signup-form";

export const metadata: Metadata = { title: "Create your account" };

async function SignupContent({ searchParams }: { searchParams: PageProps<"/signup/customer">["searchParams"] }) {
  const next = safeNextPath((await searchParams).next) ?? undefined;
  return (
    <>
      <CustomerSignupForm next={next} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-primary hover:underline">Log in</Link>
      </p>
    </>
  );
}

export default function CustomerSignupPage({ searchParams }: PageProps<"/signup/customer">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-2xl">Create your account</CardTitle>
        <CardDescription>Free, and you stay signed in on this device. Then post your job in about a minute.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <CustomerBenefits className="grid gap-2" />
        <Suspense fallback={<div className="h-72" />}>
          <SignupContent searchParams={searchParams} />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          Run a service business?{" "}
          <Link href="/signup/provider" className="font-medium text-primary hover:underline">Sign up as a provider</Link>
        </p>
      </CardContent>
    </Card>
  );
}
