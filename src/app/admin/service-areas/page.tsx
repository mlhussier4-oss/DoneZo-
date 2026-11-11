import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ServiceAreaForm } from "../admin-buttons";

export const metadata: Metadata = { title: "Service areas" };

export default async function ServiceAreasPage() {
  await requireRole("admin");
  const { data: areas } = await (await createClient()).from("service_areas").select("id, name, center_zip, radius_miles, is_active").order("name");
  return (
    <>
      <PageHeader title="Service areas" description="Customers can post jobs only from ZIP codes inside an open area. Changes are logged." />
      <div className="space-y-4">
        {(areas ?? []).map((a) => (
          <Card key={a.id}><CardContent><ServiceAreaForm area={a} /></CardContent></Card>
        ))}
        <Card className="border-dashed">
          <CardHeader><CardTitle className="text-base">Add a service area</CardTitle></CardHeader>
          <CardContent><ServiceAreaForm /></CardContent>
        </Card>
      </div>
    </>
  );
}
