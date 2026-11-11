import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Home, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupChooserPage() {
  const options = [
    { href: "/signup/customer", icon: Home, title: "I need work done", text: "Post jobs and get bids from local providers." },
    { href: "/signup/provider", icon: Store, title: "I run a service business", text: "Manage your business, and win new customers if you want." },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-2xl">Create an account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {options.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:border-primary hover:bg-primary-soft"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-cta">
              <o.icon className="size-5" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{o.title}</span>
              <span className="block text-sm text-muted-foreground">{o.text}</span>
            </span>
            <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
          </Link>
        ))}
        <p className="pt-3 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
