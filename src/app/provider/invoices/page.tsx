import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { EstimateStatusBadge, InvoiceStatusBadge } from "@/components/crm/status-badges";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requirePro } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoices" };

const invoiceFilters = [
  { value: "unpaid", label: "Unpaid", statuses: ["sent", "partially_paid"] },
  { value: "draft", label: "Drafts", statuses: ["draft"] },
  { value: "paid", label: "Paid", statuses: ["paid"] },
  { value: "all", label: "All", statuses: ["draft", "sent", "partially_paid", "paid", "void"] },
] as const;

export default async function InvoicesPage({ searchParams }: PageProps<"/provider/invoices">) {
  const { business } = await requirePro();
  const params = await searchParams;
  const tab = params.tab === "estimates" ? "estimates" : "invoices";
  const filter = invoiceFilters.find((f) => f.value === params.filter) ?? invoiceFilters[0];
  const supabase = await createClient();

  const [{ data: invoices }, { data: estimates }, { data: unpaid }] = await Promise.all([
    tab === "invoices"
      ? supabase.from("invoices").select("id, number, status, total_cents, amount_paid_cents, issue_date, due_date, crm_customers(full_name)")
          .eq("business_id", business.id).in("status", [...filter.statuses]).order("number", { ascending: false }).limit(300)
      : Promise.resolve({ data: null }),
    tab === "estimates"
      ? supabase.from("estimates").select("id, number, status, total_cents, issue_date, crm_customers(full_name)")
          .eq("business_id", business.id).order("number", { ascending: false }).limit(300)
      : Promise.resolve({ data: null }),
    supabase.from("invoices").select("total_cents, amount_paid_cents").eq("business_id", business.id).in("status", ["sent", "partially_paid"]),
  ]);
  const outstanding = (unpaid ?? []).reduce((s, i) => s + i.total_cents - i.amount_paid_cents, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="Invoices & estimates"
        description={`${formatMoney(outstanding)} outstanding across ${unpaid?.length ?? 0} unpaid ${unpaid?.length === 1 ? "invoice" : "invoices"}.`}
        actions={
          <>
            <Link href="/provider/invoices/new?kind=estimate" className={buttonVariants({ variant: "outline" })}><Plus /> Estimate</Link>
            <Link href="/provider/invoices/new" className={buttonVariants()}><Plus /> Invoice</Link>
          </>
        }
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex gap-1 rounded-lg bg-muted p-1 text-sm" aria-label="Document type">
          {(["invoices", "estimates"] as const).map((t) => (
            <Link key={t} href={t === "invoices" ? "/provider/invoices" : "/provider/invoices?tab=estimates"} aria-current={tab === t ? "page" : undefined}
              className={cn("rounded-md px-3 py-1.5 font-medium capitalize", tab === t ? "bg-card shadow-sm" : "text-muted-foreground")}>{t}</Link>
          ))}
        </nav>
        {tab === "invoices" ? (
          <nav className="flex gap-3 text-sm" aria-label="Invoice filter">
            {invoiceFilters.map((f) => (
              <Link key={f.value} href={`/provider/invoices?filter=${f.value}`} aria-current={filter.value === f.value ? "page" : undefined}
                className={cn("font-medium", filter.value === f.value ? "text-primary" : "text-muted-foreground hover:text-foreground")}>{f.label}</Link>
            ))}
          </nav>
        ) : null}
      </div>

      {tab === "invoices" ? (
        !invoices?.length ? (
          <EmptyState icon={FileText} title="No invoices here" action={<Link href="/provider/invoices/new" className={buttonVariants({ size: "sm" })}>Create an invoice</Link>} />
        ) : (
          <Card className="divide-y divide-border">
            {invoices.map((i) => {
              const overdue = (i.status === "sent" || i.status === "partially_paid") && i.due_date && i.due_date < today;
              return (
                <Link key={i.id} href={`/provider/invoices/${i.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div>
                    <p className="font-medium">#{i.number} · {i.crm_customers?.full_name}</p>
                    <p className={cn("text-sm", overdue ? "text-destructive" : "text-muted-foreground")}>
                      {formatDate(i.issue_date)}{i.due_date ? ` · due ${formatDate(i.due_date)}` : ""}{overdue ? " · overdue" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="tabular-nums">{formatMoney(i.total_cents)}</span>
                    <InvoiceStatusBadge status={i.status} />
                  </div>
                </Link>
              );
            })}
          </Card>
        )
      ) : !estimates?.length ? (
        <EmptyState icon={FileText} title="No estimates yet" action={<Link href="/provider/invoices/new?kind=estimate" className={buttonVariants({ size: "sm" })}>Create an estimate</Link>} />
      ) : (
        <Card className="divide-y divide-border">
          {estimates.map((e) => (
            <Link key={e.id} href={`/provider/estimates/${e.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="font-medium">Estimate #{e.number} · {e.crm_customers?.full_name}</p>
                <p className="text-sm text-muted-foreground">{formatDate(e.issue_date)}</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="tabular-nums">{formatMoney(e.total_cents)}</span>
                <EstimateStatusBadge status={e.status} />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
