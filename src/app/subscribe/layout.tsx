import { Logo } from "@/components/brand/logo";

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center">
      <header className="w-full bg-primary text-white shadow-sm">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
          <Logo />
          <form action="/auth/signout" method="post">
            <button type="submit" className="cursor-pointer text-sm text-white/80 hover:text-white">Sign out</button>
          </form>
        </div>
      </header>
      <div className="w-full max-w-3xl px-4 py-10">{children}</div>
    </div>
  );
}
