import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser, homePathFor } from "@/lib/auth";

async function HeaderActions() {
  const user = await getCurrentUser();
  if (user) {
    return (
      <Link href={homePathFor(user.role)} className={buttonVariants({ size: "sm" })}>
        My dashboard
      </Link>
    );
  }
  return (
    <>
      <Link href="/login" className={buttonVariants({ variant: "onDark", size: "sm", className: "border-transparent" })}>
        Log in
      </Link>
      <Link href="/post-job" className={buttonVariants({ variant: "accent", size: "sm" })}>
        Post a job
      </Link>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-primary text-primary-foreground shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          <Link
            href="/for-providers"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white sm:block"
          >
            For providers
          </Link>
          <Suspense fallback={<div className="h-9 w-32" />}>
            <HeaderActions />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
