"use client";

import { Form, useFormAction } from "@/components/ui/form";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import type { CustomerOption } from "@/lib/crm/queries";
import { formatMoney, parseMoneyToCents, parsePercentToBps } from "@/lib/format";
import { idle, type ActionState } from "@/lib/forms";

export type EditorLine = { description: string; quantity: string; unitPrice: string; taxable: boolean };

export type DocumentDefaults = {
  customerId?: string;
  jobId?: string | null;
  issueDate: string;
  dueDate?: string | null;
  taxPercent: string;
  notes?: string | null;
  lines: EditorLine[];
};

const blankLine = (): EditorLine => ({ description: "", quantity: "1", unitPrice: "", taxable: true });

/** Line-item editor for invoices and estimates. The totals shown here are a preview; the database calculates the real ones. */
export function DocumentEditor({
  kind,
  action,
  customers,
  defaults,
  lockCustomer,
  submitLabel,
}: {
  kind: "invoice" | "estimate";
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  customers: CustomerOption[];
  defaults: DocumentDefaults;
  lockCustomer?: boolean;
  submitLabel: string;
}) {
  const [state, formAction] = useFormAction(action, idle);
  const [lines, setLines] = useState<EditorLine[]>(defaults.lines.length ? defaults.lines : [blankLine()]);
  const [taxPercent, setTaxPercent] = useState(defaults.taxPercent);

  const update = (i: number, patch: Partial<EditorLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const amount = (l: EditorLine) => Math.round((Number(l.quantity) || 0) * (parseMoneyToCents(l.unitPrice || "0") ?? 0));
  const subtotal = lines.reduce((s, l) => s + amount(l), 0);
  const taxable = lines.filter((l) => l.taxable).reduce((s, l) => s + amount(l), 0);
  const tax = Math.round((taxable * (parsePercentToBps(taxPercent) ?? 0)) / 10000);

  return (
    <Form form={formAction}  className="space-y-6" noValidate>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="jobId" value={defaults.jobId ?? ""} />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer" htmlFor="customerId">
          {lockCustomer ? <input type="hidden" name="customerId" value={defaults.customerId} /> : null}
          <Select id="customerId" name={lockCustomer ? undefined : "customerId"} defaultValue={defaults.customerId ?? ""} disabled={lockCustomer} required>
            <option value="">Choose a customer…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={kind === "invoice" ? "Invoice date" : "Estimate date"} htmlFor="issueDate">
            <Input id="issueDate" name="issueDate" type="date" defaultValue={defaults.issueDate} required />
          </Field>
          <Field label={kind === "invoice" ? "Due date" : "Valid until"} htmlFor="dueDate">
            <Input id="dueDate" name="dueDate" type="date" defaultValue={defaults.dueDate ?? ""} />
          </Field>
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-1 font-semibold">Line items</legend>
        <div className="hidden grid-cols-[1fr_5rem_7rem_4.5rem_6rem_2.5rem] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
          <span>Description</span><span>Qty</span><span>Price ($)</span><span>Taxable</span><span className="text-right">Amount</span><span />
        </div>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr] gap-2 rounded-lg border border-border p-2 sm:grid-cols-[1fr_5rem_7rem_4.5rem_6rem_2.5rem] sm:items-center sm:border-0 sm:p-0">
            <Input aria-label={`Line ${i + 1} description`} value={l.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="E.g. Lawn mowing" maxLength={500} className="col-span-2 sm:col-span-1" />
            <Input aria-label={`Line ${i + 1} quantity`} value={l.quantity} onChange={(e) => update(i, { quantity: e.target.value })} inputMode="decimal" />
            <Input aria-label={`Line ${i + 1} price`} value={l.unitPrice} onChange={(e) => update(i, { unitPrice: e.target.value })} inputMode="decimal" placeholder="0.00" />
            <label className="flex items-center gap-2 text-sm sm:justify-center">
              <input type="checkbox" checked={l.taxable} onChange={(e) => update(i, { taxable: e.target.checked })} className="size-4 accent-[var(--primary)]" />
              <span className="sm:sr-only">Taxable</span>
            </label>
            <span className="self-center text-right text-sm tabular-nums">{formatMoney(amount(l))}</span>
            <Button type="button" variant="ghost" size="sm" aria-label={`Remove line ${i + 1}`} disabled={lines.length === 1}
              onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="col-span-2 justify-self-end sm:col-span-1">
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, blankLine()])}><Plus /> Add line</Button>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-[1fr_16rem]">
        <Field label="Notes for the customer (optional)" htmlFor="notes">
          <Textarea id="notes" name="notes" defaultValue={defaults.notes ?? ""} maxLength={5000} className="min-h-24" />
        </Field>
        <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{formatMoney(subtotal)}</span></div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="taxPercent">Tax (%)</label>
            <Input id="taxPercent" name="taxPercent" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} inputMode="decimal" className="h-9 w-20 text-right" />
          </div>
          <div className="flex justify-between"><span>Tax</span><span className="tabular-nums">{formatMoney(tax)}</span></div>
          <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span className="tabular-nums">{formatMoney(subtotal + tax)}</span></div>
        </div>
      </div>

      <FormAlert state={state} />
      <SubmitButton>{submitLabel}</SubmitButton>
    </Form>
  );
}
