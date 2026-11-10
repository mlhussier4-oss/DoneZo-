import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { requireProvider } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: PageProps<"/provider/customers">) {
  const { business } = await requireProvider();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const view = params.view === "archived" ? "archived" : "active";

  const supabase = await createClient();
  let query = supabase
    .from("crm_customers")
    .select("id, full_name, email, phone, source, crm_customer_addresses(line1, city, is_primary), recurring_schedules(status)")
    .eq("business_id", business.id)
    .eq("is_archived", view === "archived")
    .order("full_name")
    .limit(500);
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, " ")}%`;
    query = query.or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
  }
  const { data: customers } = await query;

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone you work for, from the marketplace or your own customers."
        actions={
          <Link href="/provider/customers/new" className={buttonVariants()}>
            <Plus /> Add customer
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="relative w-full sm:max-w-sm" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Search name, email or phone" aria-label="Search customers" className="pl-9" />
          {view === "archived" ? <input type="hidden" name="view" value="archived" /> : null}
        </form>
        <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm" role="tablist" aria-label="Customer list">
          {(["active", "archived"] as const).map((v) => (
            <Link
              key={v}
              href={v === "active" ? "/provider/customers" : "/provider/customers?view=archived"}
              role="tab"
              aria-selected={view === v}
              className={cn("rounded-md px-3 py-1.5 font-medium capitalize", view === v ? "bg-card shadow-sm" : "text-muted-foreground")}
            >
              {v}
            </Link>
          ))}
        </div>
      </div>

      {!customers?.length ? (
        <EmptyState
          icon={Users}
          title={q ? "No customers match your search" : view === "archived" ? "No archived customers" : "No customers yet"}
          action={
            !q && view === "active" ? (
              <Link href="/provider/customers/new" className={buttonVariants({ size: "sm" })}>
                Add your first customer
              </Link>
            ) : null
          }
        >
          {!q && view === "active" ? "Add the customers you already have. They're private to your business." : null}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-border">
          {customers.map((c) => {
            const addresses = c.crm_customer_addresses ?? [];
            const primary = addresses.find((a) => a.is_primary) ?? addresses[0];
            const recurring = (c.recurring_schedules ?? []).some((s) => s.status === "active");
            return (
              <Link
                key={c.id}
                href={`/provider/customers/${c.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0">
                  <p className="font-medium">{c.full_name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[c.phone, c.email].filter(Boolean).join(" · ") || "No contact details"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {primary ? <span className="truncate">{primary.line1}, {primary.city}</span> : null}
                  {recurring ? <Badge tone="primary">Recurring</Badge> : null}
                  {c.source === "marketplace" ? <Badge tone="accent">Marketplace</Badge> : null}
                </div>
              </Link>
            );
          })}
        </Card>
      )}
      {customers && customers.length >= 500 ? (
        <p className="mt-3 text-sm text-muted-foreground">Showing the first 500. Use search to narrow the list.</p>
      ) : null}
    </>
  );
}
