import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePro } from "@/lib/auth";
import { getTeam } from "@/lib/crm/team";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { InviteForm, MemberControls, RevokeInviteButton } from "./team-controls";

export const metadata: Metadata = { title: "Team" };

const roleHelp = {
  owner: "Everything, including billing, Stripe and the team.",
  manager: "Runs the business day to day: customers, jobs, invoices, payments, reports, marketplace. Not billing or Stripe.",
  employee: "Sees only the jobs assigned to them: the customer's name, address and phone, and the job's price. No invoices, payments or reports. Can start and complete jobs and add notes and photos.",
};

export default async function TeamPage() {
  const { user, business } = await requirePro();
  const isOwner = business.memberRole === "owner";
  const supabase = await createClient();
  const [team, { data: invites }] = await Promise.all([
    getTeam(business.id),
    supabase.from("business_invitations").select("id, email, full_name, role, created_at, expires_at")
      .eq("business_id", business.id).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader title="Team" description="Add employees and managers. Everyone signs in with their own email and password; employees only see the jobs you assign them." />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Invite someone</CardTitle>
          <CardDescription>They&apos;ll get an email to join {business.name} and choose a password. Included in your plan.</CardDescription>
        </CardHeader>
        <CardContent><InviteForm canInviteManagers={isOwner} /></CardContent>
      </Card>

      <Card className="divide-y divide-border">
        {team.map((m) => (
          <div key={m.user_id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {m.name}{m.user_id === user.id ? <span className="text-xs text-muted-foreground">(you)</span> : null}
                <Badge tone={m.role === "owner" ? "primary" : m.role === "manager" ? "accent" : "neutral"} className="capitalize">{m.role}</Badge>
              </p>
              <p className="text-sm text-muted-foreground">{m.email}</p>
            </div>
            {m.role !== "owner" && m.user_id !== user.id ? <MemberControls userId={m.user_id} role={m.role} isOwnerViewing={isOwner} name={m.name} /> : null}
          </div>
        ))}
        {(invites ?? []).map((i) => (
          <div key={i.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="flex flex-wrap items-center gap-2 font-medium">{i.full_name || i.email}<Badge tone="warning">Invited</Badge><Badge className="capitalize">{i.role}</Badge></p>
              <p className="text-sm text-muted-foreground">{i.email} · expires {formatDate(i.expires_at, business.timezone)}</p>
            </div>
            <RevokeInviteButton id={i.id} />
          </div>
        ))}
      </Card>

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        {(Object.keys(roleHelp) as (keyof typeof roleHelp)[]).map((r) => (
          <div key={r} className="rounded-lg border border-border bg-card p-3"><dt className="font-medium capitalize">{r}</dt><dd className="text-muted-foreground">{roleHelp[r]}</dd></div>
        ))}
      </dl>
    </>
  );
}
