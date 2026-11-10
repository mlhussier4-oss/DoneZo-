import Link from "next/link";
import { brand } from "@/config/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>{brand.name}: {brand.tagline}</p>
        <nav className="flex flex-wrap gap-4" aria-label="Footer">
          <Link href="/for-providers" className="hover:text-foreground">For providers</Link>
          <Link href="/signup/provider" className="hover:text-foreground">Provider sign up</Link>
          <Link href="/login" className="hover:text-foreground">Log in</Link>
        </nav>
      </div>
    </footer>
  );
}
