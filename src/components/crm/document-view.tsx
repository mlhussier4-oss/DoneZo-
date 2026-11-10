import { formatDate, formatMoney } from "@/lib/format";

export type DocumentViewData = {
  kind: "invoice" | "estimate";
  number: number;
  issue_date: string;
  due_date?: string | null;
  valid_until?: string | null;
  notes: string | null;
  subtotal_cents: number;
  tax_rate_bps: number;
  tax_cents: number;
  total_cents: number;
  amount_paid_cents?: number;
  business: { name: string; email: string | null; phone: string | null };
  customer_name: string;
  line_items: { description: string; quantity: number | string; unit_price_cents: number; amount_cents: number }[];
};

/** The invoice/estimate as the customer sees it. Used on the provider's page and the customer's link. */
export function DocumentView({ doc }: { doc: DocumentViewData }) {
  const balance = doc.total_cents - (doc.amount_paid_cents ?? 0);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div>
          <p className="text-lg font-semibold">{doc.business.name}</p>
          <p className="text-sm text-muted-foreground">{[doc.business.phone, doc.business.email].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="text-sm sm:text-right">
          <p className="text-lg font-semibold capitalize">{doc.kind} #{doc.number}</p>
          <p className="text-muted-foreground">Date: {formatDate(doc.issue_date)}</p>
          {doc.kind === "invoice" && doc.due_date ? <p className="text-muted-foreground">Due: {formatDate(doc.due_date)}</p> : null}
          {doc.kind === "estimate" && doc.valid_until ? <p className="text-muted-foreground">Valid until: {formatDate(doc.valid_until)}</p> : null}
        </div>
      </div>
      <p className="text-sm"><span className="text-muted-foreground">For: </span><span className="font-medium">{doc.customer_name}</span></p>

      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-muted-foreground">
          <tr>
            <th className="py-2 font-medium">Description</th>
            <th className="py-2 text-right font-medium">Qty</th>
            <th className="hidden py-2 text-right font-medium sm:table-cell">Price</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {doc.line_items.map((l, i) => (
            <tr key={i} className="border-b border-border align-top">
              <td className="py-2 pr-2">{l.description}</td>
              <td className="py-2 text-right tabular-nums">{Number(l.quantity)}</td>
              <td className="hidden py-2 text-right tabular-nums sm:table-cell">{formatMoney(l.unit_price_cents)}</td>
              <td className="py-2 text-right tabular-nums">{formatMoney(l.amount_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{formatMoney(doc.subtotal_cents)}</span></div>
        {doc.tax_cents ? <div className="flex justify-between"><span>Tax ({doc.tax_rate_bps / 100}%)</span><span className="tabular-nums">{formatMoney(doc.tax_cents)}</span></div> : null}
        <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold"><span>Total</span><span className="tabular-nums">{formatMoney(doc.total_cents)}</span></div>
        {doc.kind === "invoice" && doc.amount_paid_cents ? (
          <>
            <div className="flex justify-between text-success"><span>Paid</span><span className="tabular-nums">−{formatMoney(doc.amount_paid_cents)}</span></div>
            <div className="flex justify-between font-semibold"><span>Balance due</span><span className="tabular-nums">{formatMoney(balance)}</span></div>
          </>
        ) : null}
      </div>
      {doc.notes ? <p className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{doc.notes}</p> : null}
    </div>
  );
}
