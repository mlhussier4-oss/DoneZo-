import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CategoryForm, type CategoryRow } from "./category-form";

export const metadata: Metadata = { title: "Service categories" };

export default async function AdminCategoriesPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("service_categories")
    .select("id, slug, name, description, icon, sort_order, is_active")
    .order("sort_order");
  const categories = (data ?? []) as CategoryRow[];

  return (
    <>
      <PageHeader title="Service categories" description="Changes are recorded in the audit log and appear on the website immediately." />
      <div className="space-y-4">
        {categories.map((c) => (
          <Card key={c.id}>
            <CardHeader className="flex flex-row items-center gap-3">
              <CardTitle className="text-base">{c.name}</CardTitle>
              {c.is_active ? <Badge tone="success">Visible</Badge> : <Badge>Hidden</Badge>}
            </CardHeader>
            <CardContent>
              <CategoryForm category={c} submitLabel="Save" />
            </CardContent>
          </Card>
        ))}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Add a category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryForm submitLabel="Add category" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
