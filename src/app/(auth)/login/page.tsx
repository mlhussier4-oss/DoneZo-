import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth";
import { LoginTabs } from "./login-tabs";

export const metadata: Metadata = { title: "Log in" };

const errors: Record<string, string> = {
  suspended: "This account has been suspended. Please contact support.",
  link: "That link is invalid or has expired. Please try again.",
  no_business: "You're no longer part of a DoneZo business team. Ask the business owner if you think this is a mistake.",
};

async function LoginContent({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const next = safeNextPath(params.next) ?? undefined;
  const error = typeof params.error === "string" ? errors[params.error] : undefined;
  const initialTab = next?.startsWith("/provider") || next?.startsWith("/admin") ? "business" : "customer";
  return (
    <>
      {error ? <Alert tone="error" className="mb-4">{error}</Alert> : null}
      <LoginTabs initialTab={initialTab} next={next} />
    </>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-2xl">Welcome back</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="h-64" />}>
          <LoginContent searchParams={searchParams} />
        </Suspense>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to DoneZo?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
