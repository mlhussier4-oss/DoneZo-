import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-[linear-gradient(to_bottom,var(--primary)_0,var(--primary)_13rem,var(--background)_13rem)] px-4 py-10">
      <div className="mb-8 text-white">
        <Logo />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
