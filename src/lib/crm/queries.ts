import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CustomerOption = {
  id: string;
  full_name: string;
  addresses: { id: string; label: string; is_primary: boolean }[];
};

/** Active customers with their addresses, for job / invoice / recurring forms. */
export async function getCustomerOptions(businessId: string): Promise<CustomerOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_customers")
    .select("id, full_name, crm_customer_addresses(id, line1, city, is_primary)")
    .eq("business_id", businessId)
    .eq("is_archived", false)
    .order("full_name")
    .limit(2000);
  return (data ?? []).map((c) => ({
    id: c.id,
    full_name: c.full_name,
    addresses: (c.crm_customer_addresses ?? [])
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
      .map((a) => ({ id: a.id, label: `${a.line1}, ${a.city}`, is_primary: a.is_primary })),
  }));
}

export type CategoryOption = { id: string; name: string };

export async function getCategoryOptions(): Promise<CategoryOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("service_categories").select("id, name").eq("is_active", true).order("sort_order");
  return data ?? [];
}
