import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Account" };

export default async function CustomerAccountPage() {
  const user = await requireRole("customer");
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).single();
  return (
    <>
      <PageHeader title="Account" />
      <Card className="max-w-xl">
        <CardContent>
          <ProfileForm fullName={data?.full_name ?? ""} phone={data?.phone ?? ""} email={user.email ?? ""} />
        </CardContent>
      </Card>
    </>
  );
}
