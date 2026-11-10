"use client";

import { useState } from "react";
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
      {tab === "customer" ? <EmailCodeForm next={next} /> : <PasswordSignInForm next={next} />}
    </div>
  );
}
