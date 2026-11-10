import { brand } from "@/config/brand";

/** Minimal layout for the documents customers open from a link. */
export default function PublicDocumentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">{children}</main>
      <footer className="py-6 text-center text-xs text-muted-foreground">Sent with {brand.name}</footer>
    </div>
  );
}
