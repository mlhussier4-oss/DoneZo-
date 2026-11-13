import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { brand } from "@/config/brand";

/** Private test (owner decision 2026-11-11): banner on every page and no search-engine listing. */
const privateTest = process.env.NEXT_PUBLIC_PRIVATE_TEST === "true";

export const metadata: Metadata = {
  title: { default: `${brand.name}: home services, done`, template: `%s · ${brand.name}` },
  description: brand.description,
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: brand.name, statusBarStyle: "default" },
  ...(privateTest ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1c2e4a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {privateTest ? (
          <div role="note" className="bg-warning px-4 py-1.5 text-center text-xs font-medium text-white">
            HomeHire is in private testing. Payments are test-only: no real money is charged.
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}
