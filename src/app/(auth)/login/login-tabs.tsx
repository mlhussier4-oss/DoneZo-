"use client";

import Link from "next/link";
import { useState } from "react";
import { CustomerBenefits } from "@/components/marketing/customer-benefits";
import { cn } from "@/lib/utils";
import { EmailCodeForm } from "../_components/email-code-form";
import { PasswordSignInForm } from "../_components/password-sign-in-form";

type Tab = "customer" | "business";

export function LoginTabs({ initialTab, next }: { initialTab: Tab; next?: string }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Account type" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(
          [
            ["customer", "Customer"],
            ["business", "Provider or admin"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "h-10 cursor-pointer rounded-md text-sm font-medium transition-colors",
              tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "customer" ? <CustomerLogin next={next} /> : <PasswordSignInForm next={next} />}
    </div>
  );
}

/** Customers: the benefits at a glance, then email + password (or a one-time code). */
function CustomerLogin({ next }: { next?: string }) {
  const [withCode, setWithCode] = useState(false);
  return (
    <div className="space-y-5">
      <CustomerBenefits className="grid gap-2" />
      {withCode ? <EmailCodeForm next={next} /> : <PasswordSignInForm next={next} />}
      <button type="button" onClick={() => setWithCode(!withCode)} className="w-full cursor-pointer text-center text-sm text-primary hover:underline">
        {withCode ? "Use my password instead" : "Email me a sign-in code instead"}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        New to HomeHire?{" "}
        <Link href={next ? `/signup/customer?next=${encodeURIComponent(next)}` : "/signup/customer"} className="font-medium text-primary hover:underline">Create your account</Link>
      </p>
    </div>
  );
}
