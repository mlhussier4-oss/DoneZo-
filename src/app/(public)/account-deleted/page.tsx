import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Account deleted" };

export default function AccountDeletedPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Your account has been deleted</h1>
      <p className="mt-3 text-muted-foreground">Your personal details and login have been removed, and you&apos;ve been signed out. Thanks for trying HomeHire. You&apos;re welcome back any time.</p>
      <Link href="/" className={buttonVariants({ className: "mt-6" })}>Back to HomeHire</Link>
    </div>
  );
}
