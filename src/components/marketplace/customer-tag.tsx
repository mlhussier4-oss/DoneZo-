import { Avatar } from "@/components/ui/avatar";

/** How a customer appears to providers before hiring: first name and photo only (owner decision 2026-11-13). */
export function CustomerTag({ customer }: { customer: unknown }) {
  const c = customer as { first_name?: string; avatar_path?: string | null } | null;
  const name = c?.first_name ?? "Customer";
  return (
    <span className="flex items-center gap-1.5 font-medium text-foreground">
      <Avatar path={c?.avatar_path} name={name} size="sm" className="size-5 text-[10px]" />
      {name}
    </span>
  );
}
