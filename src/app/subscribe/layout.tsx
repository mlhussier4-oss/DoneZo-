import { Logo } from "@/components/brand/logo";

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10">
      <div className="mb-8 flex w-full max-w-lg items-center justify-between">
        <Logo />
        <form action="/auth/signout" method="post">
          <button type="submit" className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">Sign out</button>
        </form>
      </div>
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}
