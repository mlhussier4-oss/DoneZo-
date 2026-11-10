"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireProvider } from "@/lib/auth";
import { addressSchema, customerSchema, hasAnyAddress, noteSchema, uuid } from "@/lib/crm/schemas";
import { dbErrorMessage, zodErrors, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const fields = (fd: FormData) => Object.fromEntries(fd) as Record<string, string>;

export async function createCustomer(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { business } = await requireProvider();
  const customer = customerSchema.safeParse(fields(fd));
  if (!customer.success) return zodErrors(customer.error);
  const withAddress = hasAnyAddress(fd);
  const address = withAddress ? addressSchema.safeParse(fields(fd)) : null;
  if (address && !address.success) return zodErrors(address.error);
  const note = String(fd.get("note") ?? "").trim();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_customers")
    .insert({
      business_id: business.id,
      full_name: customer.data.fullName,
      email: customer.data.email,
      phone: customer.data.phone,
      service_preferences: customer.data.servicePreferences,
    })
    .select("id")
    .single();
  if (error || !data) return { status: "error", message: dbErrorMessage(error, "Could not add the customer. Please try again.") };

  if (address?.success) {
    const a = address.data;
    await supabase.from("crm_customer_addresses").insert({
      business_id: business.id, customer_id: data.id, label: a.label, line1: a.line1, line2: a.line2,
      city: a.city, state: a.state, postal_code: a.postalCode, access_notes: a.accessNotes, is_primary: true,
    });
  }
  if (note) {
    await supabase.from("crm_customer_notes").insert({ business_id: business.id, customer_id: data.id, body: note.slice(0, 5000) });
  }
  redirect(`/provider/customers/${data.id}`);
}

export async function updateCustomer(customerId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireProvider();
  if (!uuid.safeParse(customerId).success) return { status: "error", message: "Unknown customer." };
  const parsed = customerSchema.safeParse(fields(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_customers")
    .update({
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      service_preferences: parsed.data.servicePreferences,
    })
    .eq("id", customerId);
  if (error) return { status: "error", message: dbErrorMessage(error, "Could not save changes.") };
  redirect(`/provider/customers/${customerId}`);
}

export async function setCustomerArchived(customerId: string, archived: boolean): Promise<void> {
  await requireProvider();
  if (!uuid.safeParse(customerId).success) return;
  const supabase = await createClient();
  await supabase.from("crm_customers").update({ is_archived: archived }).eq("id", customerId);
  refresh();
}

export async function addAddress(customerId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { business } = await requireProvider();
  if (!uuid.safeParse(customerId).success) return { status: "error", message: "Unknown customer." };
  const parsed = addressSchema.safeParse(fields(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const supabase = await createClient();
  const { count } = await supabase
    .from("crm_customer_addresses")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);
  const a = parsed.data;
  const { error } = await supabase.from("crm_customer_addresses").insert({
    business_id: business.id, customer_id: customerId, label: a.label, line1: a.line1, line2: a.line2,
    city: a.city, state: a.state, postal_code: a.postalCode, access_notes: a.accessNotes, is_primary: (count ?? 0) === 0,
  });
  if (error) return { status: "error", message: dbErrorMessage(error, "Could not add the address.") };
  refresh();
  return { status: "success", message: "Address added." };
}

export async function makeAddressPrimary(customerId: string, addressId: string): Promise<void> {
  await requireProvider();
  if (!uuid.safeParse(customerId).success || !uuid.safeParse(addressId).success) return;
  const supabase = await createClient();
  await supabase.from("crm_customer_addresses").update({ is_primary: false }).eq("customer_id", customerId);
  await supabase.from("crm_customer_addresses").update({ is_primary: true }).eq("id", addressId).eq("customer_id", customerId);
  refresh();
}

export async function deleteAddress(addressId: string): Promise<void> {
  await requireProvider();
  if (!uuid.safeParse(addressId).success) return;
  const supabase = await createClient();
  // Addresses used by jobs are protected by a foreign key; the delete simply fails in that case.
  await supabase.from("crm_customer_addresses").delete().eq("id", addressId);
  refresh();
}

export async function addNote(customerId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { business } = await requireProvider();
  if (!uuid.safeParse(customerId).success) return { status: "error", message: "Unknown customer." };
  const parsed = noteSchema.safeParse(fields(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_customer_notes")
    .insert({ business_id: business.id, customer_id: customerId, body: parsed.data.body });
  if (error) return { status: "error", message: dbErrorMessage(error, "Could not save the note.") };
  refresh();
  return { status: "success" };
}

export async function deleteNote(noteId: string): Promise<void> {
  await requireProvider();
  if (!uuid.safeParse(noteId).success) return;
  const supabase = await createClient();
  await supabase.from("crm_customer_notes").delete().eq("id", noteId);
  refresh();
}
