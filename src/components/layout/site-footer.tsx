import Link from "next/link";
import { brand } from "@/config/brand";

export function SiteFooter() {
  return (
    <footer className="bg-primary text-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>{brand.name}: {brand.tagline}</p>
        <nav className="flex flex-wrap gap-4" aria-label="Footer">
          <Link href="/for-providers" className="hover:text-white">For providers</Link>
          <Link href="/signup/provider" className="hover:text-white">Provider sign up</Link>
          <Link href="/login" className="hover:text-white">Log in</Link>
          <Link href="/help" className="hover:text-white">Help</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
