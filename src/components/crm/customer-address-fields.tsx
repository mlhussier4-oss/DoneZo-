"use client";

import { useState } from "react";
import Link from "next/link";
import { Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CategoryOption, CustomerOption } from "@/lib/crm/queries";

/** Customer + address (+ optional category) pickers; the address list follows the chosen customer. */
export function CustomerAddressFields({
  customers,
  categories,
  defaults,
  errors,
  lockCustomer = false,
}: {
  customers: CustomerOption[];
  categories?: CategoryOption[];
  defaults: { customerId?: string; addressId?: string | null; categoryId?: string | null };
  errors: Record<string, string>;
  lockCustomer?: boolean;
}) {
  const [customerId, setCustomerId] = useState(defaults.customerId ?? "");
  const customer = customers.find((c) => c.id === customerId);
  const defaultAddress =
    defaults.addressId && customer?.addresses.some((a) => a.id === defaults.addressId)
      ? defaults.addressId
      : (customer?.addresses[0]?.id ?? "");

  return (
    <>
      <Field label="Customer" htmlFor="customerId" error={errors.customerId}>
        {lockCustomer ? <input type="hidden" name="customerId" value={customerId} /> : null}
        <Select
          id="customerId"
          name={lockCustomer ? undefined : "customerId"}
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          disabled={lockCustomer}
          required
        >
          <option value="">Choose a customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </Select>
      </Field>
      {customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You have no customers yet. <Link href="/provider/customers/new" className="text-primary hover:underline">Add one first</Link>.
        </p>
      ) : null}
      <div className={categories ? "grid gap-4 sm:grid-cols-2" : ""}>
        <Field label="Service address" htmlFor="addressId" error={errors.addressId}>
          <Select id="addressId" name="addressId" key={customerId} defaultValue={defaultAddress} disabled={!customer}>
            <option value="">{customer?.addresses.length ? "No address" : "No addresses on file"}</option>
            {customer?.addresses.map((a) => (
              <option key={a.id} value={a.id}>{a.label}{a.is_primary ? " (primary)" : ""}</option>
            ))}
          </Select>
        </Field>
        {categories ? (
          <Field label="Service" htmlFor="categoryId" error={errors.categoryId}>
            <Select id="categoryId" name="categoryId" defaultValue={defaults.categoryId ?? ""}>
              <option value="">Other / not set</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>
    </>
  );
}
