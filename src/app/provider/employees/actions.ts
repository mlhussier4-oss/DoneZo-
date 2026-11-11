"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireManager } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { dbErrorMessage, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  fullName: z.string().trim().max(120),
  role: z.enum(["employee", "manager"]),
});

/** Create the invitation (permission-checked in the database), then send Supabase's invite email. */
export async function inviteTeamMember(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { business } = await requireManager();
  const parsed = inviteSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { status: "error", fieldErrors: { email: parsed.error.issues[0]?.message ?? "Check the form." } };
  const v = parsed.data;
  const supabase = await createClient();
  const { data: inv, error } = await supabase.rpc("create_invitation", {
    p_business_id: business.id, p_email: v.email, p_full_name: v.fullName, p_role: v.role,
  });
  if (error || !inv) return { status: "error", message: dbErrorMessage(error, "Could not create the invitation.") };

  const service = createServiceClient();
  await removeUnacceptedLogin(service, v.email); // an earlier, never-accepted invite: start fresh
  const { error: mailError } = await service.auth.admin.inviteUserByEmail(v.email, {
    data: { invite_token: inv.token, full_name: v.fullName || null, business_name: business.name },
    redirectTo: siteUrl("/account/update-password?welcome=1").toString(),
  });
  if (mailError) {
    await supabase.rpc("revoke_invitation", { p_invitation_id: inv.id });
    return { status: "error", message: "We couldn't send the invitation email. Please try again." };
  }
  refresh();
  return { status: "success", message: `Invitation sent to ${v.email}.` };
}

/** Supabase creates a login when an invite is sent. If it was never accepted, delete it (it has no data). */
async function removeUnacceptedLogin(service: ReturnType<typeof createServiceClient>, email: string) {
  const { data: userId } = await service.rpc("is_unaccepted_invitee", { p_email: email });
  if (userId) await service.auth.admin.deleteUser(userId);
}

const uuid = z.string().uuid();

export async function revokeInvite(id: string): Promise<{ error?: string }> {
  await requireManager();
  if (!uuid.safeParse(id).success) return { error: "Unknown invitation." };
  const supabase = await createClient();
  const { data: inv } = await supabase.from("business_invitations").select("email").eq("id", id).maybeSingle();
  const { error } = await supabase.rpc("revoke_invitation", { p_invitation_id: id });
  if (error || !inv) return { error: dbErrorMessage(error, "Could not cancel the invitation.") };
  await removeUnacceptedLogin(createServiceClient(), inv.email);
  refresh();
  return {};
}

export async function changeRole(userId: string, role: "manager" | "employee"): Promise<{ error?: string }> {
  const { business } = await requireManager();
  if (!uuid.safeParse(userId).success) return { error: "Unknown person." };
  const { error } = await (await createClient()).rpc("set_member_role", { p_business_id: business.id, p_user_id: userId, p_role: role });
  if (error) return { error: dbErrorMessage(error, "Could not change the role.") };
  refresh();
  return {};
}

export async function removeTeamMember(userId: string): Promise<{ error?: string }> {
  const { business } = await requireManager();
  if (!uuid.safeParse(userId).success) return { error: "Unknown person." };
  const { error } = await (await createClient()).rpc("remove_member", { p_business_id: business.id, p_user_id: userId });
  if (error) return { error: dbErrorMessage(error, "Could not remove this person.") };
  refresh();
  return {};
}
