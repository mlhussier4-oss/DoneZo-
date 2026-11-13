import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PhotoForm, ProfileForm, SaveAccountForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function CustomerAccountPage() {
  const user = await requireRole("customer");
  const { data } = await (await createClient()).from("profiles").select("full_name, avatar_path").eq("id", user.id).single();
  const firstName = data?.full_name ?? "";
  return (
    <>
      <PageHeader title="Your profile" description="Providers only see your first name and photo. You choose what else to share in the chat." />
      <div className="grid max-w-xl gap-6">
        {!user.email ? (
          <Card className="border-cta">
            <CardHeader>
              <CardTitle>Save your account</CardTitle>
              <CardDescription>Add an email and password to keep your jobs, log in on any device and post new jobs.</CardDescription>
            </CardHeader>
            <CardContent><SaveAccountForm firstName={firstName} /></CardContent>
          </Card>
        ) : null}
        <Card>
          <CardContent className="space-y-6">
            <PhotoForm userId={user.id} path={data?.avatar_path ?? null} firstName={firstName} />
            {user.email ? <ProfileForm firstName={firstName} email={user.email} /> : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
