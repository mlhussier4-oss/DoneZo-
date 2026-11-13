import { ListChecks, MailX, ShieldCheck, Zap } from "lucide-react";

/** Why homeowners use DoneZo (owner request 2026-11-13). Shown on customer log-in and sign-up. */
export function CustomerBenefits({ className }: { className?: string }) {
  const items = [
    { icon: Zap, title: "Quick", text: "Snap a few photos and post your job in about a minute." },
    { icon: MailX, title: "No stuffed inbox", text: "Pros can't message you until you pick one. No flood of calls, texts or sales pitches." },
    { icon: ListChecks, title: "Easy to choose", text: "Bids arrive side by side on your dashboard. Compare price and reviews, then tap the one you want." },
    { icon: ShieldCheck, title: "Your info stays private", text: "Pros see only your first name, photo and ZIP code. You decide what to share, and when." },
  ];
  return (
    <ul className={className ?? "grid gap-3 sm:grid-cols-2"} aria-label="Why use DoneZo" data-testid="customer-benefits">
      {items.map((i) => (
        <li key={i.title} className="flex gap-3 rounded-lg bg-muted/60 p-3">
          <i.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold">{i.title}</p>
            <p className="text-muted-foreground">{i.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
