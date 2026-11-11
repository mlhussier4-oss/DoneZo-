"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

/** Friendly "something went wrong" screen. Details stay in the server logs; the user gets a reference code. */
export function ErrorView({ error, retry, homeHref = "/dashboard" }: { error: unknown; retry: () => void; homeHref?: string }) {
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning"><AlertTriangle className="size-6" aria-hidden /></span>
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground">
        Nothing you entered has been lost from what was already saved. Please try again. If it keeps happening, contact support{digest ? " and mention the code below" : ""}.
      </p>
      {digest ? <p className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">Code: {digest}</p> : null}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href={homeHref} className={buttonVariants({ variant: "outline" })}>Go to my dashboard</Link>
        <Link href="/help" className={buttonVariants({ variant: "ghost" })}>Get help</Link>
      </div>
    </div>
  );
}
