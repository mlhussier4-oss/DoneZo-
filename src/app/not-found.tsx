import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link href="/dashboard" className={buttonVariants({ className: "mt-2" })}>Go to my dashboard</Link>
    </div>
  );
}
