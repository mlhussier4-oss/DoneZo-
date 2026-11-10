import { Droplets, PawPrint, Sparkles, Sprout, Truck, Wrench, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  truck: Truck,
  sprout: Sprout,
  "paw-print": PawPrint,
  droplets: Droplets,
  sparkles: Sparkles,
  wrench: Wrench,
};

/** Icons admins can choose for a service category. */
export const categoryIconNames = Object.keys(icons);

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Wrench;
  return <Icon className={className} aria-hidden />;
}
