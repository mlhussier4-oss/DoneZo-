import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export type ServiceCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  sort_order: number;
  /** On for every provider unless they turn it off (e.g. Misc / other). */
  default_on: boolean;
};

export const CATEGORIES_TAG = "service-categories";

/** Active service categories, as the public sees them. Cached; refreshed when an admin edits one. */
export async function getActiveCategories(): Promise<ServiceCategory[]> {
  "use cache";
  cacheTag(CATEGORIES_TAG);
  cacheLife("minutes"); // admin edits refresh it immediately; this bounds anything changed outside the app
  const { data, error } = await createPublicClient()
    .from("service_categories")
    .select("id, slug, name, description, icon, sort_order, default_on")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(`Could not load service categories: ${error.message}`);
  return data;
}
