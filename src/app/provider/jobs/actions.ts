"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireManager, requireProvider } from "@/lib/auth";
import { jobColumns, jobFormSchema } from "@/lib/crm/job-schema";
import { uuid } from "@/lib/crm/schemas";
import { dbErrorMessage, zodErrors, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const fields = (fd: FormData) => Object.fromEntries(fd) as Record<string, string>;

export async function createJob(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { business } = await requireManager();
  const parsed = jobFormSchema.safeParse(fields(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const cols = jobColumns(parsed.data, business.timezone);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert({ business_id: business.id, ...cols, status: cols.scheduled_start ? "scheduled" : "new" })
    .select("id")
    .single();
  if (error || !data) return { status: "error", message: dbErrorMessage(error, "Could not create the job. Check the customer and address.") };
  redirect(`/provider/jobs/${data.id}`);
}

export async function updateJob(jobId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { business } = await requireManager();
  if (!uuid.safeParse(jobId).success) return { status: "error", message: "Unknown job." };
  const parsed = jobFormSchema.safeParse(fields(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const { customer_id: _ignored, ...cols } = jobColumns(parsed.data, business.timezone);
  void _ignored; // the customer of an existing job can't be changed
  const supabase = await createClient();
  const { data: current } = await supabase.from("jobs").select("status").eq("id", jobId).single();
  const status = current?.status === "new" && cols.scheduled_start ? "scheduled" : current?.status;
  const { error } = await supabase.from("jobs").update({ ...cols, status }).eq("id", jobId);
  if (error) return { status: "error", message: dbErrorMessage(error, "Could not save the job.") };
  redirect(`/provider/jobs/${jobId}`);
}

const statusSchema = z.enum(["new", "scheduled", "in_progress", "awaiting_payment", "completed", "canceled"]);

export async function setJobStatus(jobId: string, status: string): Promise<{ error?: string }> {
  await requireProvider();
  const s = statusSchema.safeParse(status);
  if (!uuid.safeParse(jobId).success || !s.success) return { error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({ status: s.data }).eq("id", jobId);
  if (error) return { error: dbErrorMessage(error, "Could not update the status.") };
  refresh();
  return {};
}

export async function saveJobNotes(jobId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireProvider();
  if (!uuid.safeParse(jobId).success) return { status: "error", message: "Unknown job." };
  const notes = String(fd.get("notes") ?? "").trim().slice(0, 5000);
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({ notes: notes || null }).eq("id", jobId);
  if (error) return { status: "error", message: "Could not save notes." };
  refresh();
  return { status: "success", message: "Notes saved." };
}

/** Called after the browser has uploaded the file straight to storage. */
export async function registerJobPhoto(jobId: string, storagePath: string, caption: string): Promise<{ error?: string }> {
  const { business } = await requireProvider();
  if (!uuid.safeParse(jobId).success) return { error: "Unknown job." };
  const supabase = await createClient();
  const { error } = await supabase.from("job_photos").insert({
    business_id: business.id,
    job_id: jobId,
    storage_path: storagePath,
    caption: caption.trim().slice(0, 300) || null,
  });
  if (error) {
    await supabase.storage.from("job-photos").remove([storagePath]);
    return { error: "Could not save the photo." };
  }
  refresh();
  return {};
}

export async function deleteJobPhoto(photoId: string): Promise<void> {
  await requireManager();
  if (!uuid.safeParse(photoId).success) return;
  const supabase = await createClient();
  const { data } = await supabase.from("job_photos").select("storage_path").eq("id", photoId).single();
  if (!data) return;
  await supabase.storage.from("job-photos").remove([data.storage_path]);
  await supabase.from("job_photos").delete().eq("id", photoId);
  refresh();
}

export async function invoiceJob(jobId: string): Promise<{ error?: string }> {
  await requireManager();
  if (!uuid.safeParse(jobId).success) return { error: "Unknown job." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invoice_for_job", { p_job_id: jobId });
  if (error || !data) return { error: dbErrorMessage(error, "Could not create the invoice.") };
  redirect(`/provider/invoices/${data.id}`);
}

/** Replace the set of people assigned to a job (owners/managers only; the database checks they're on the team). */
export async function setJobAssignees(jobId: string, userIds: string[]): Promise<{ error?: string }> {
  const { business } = await requireManager();
  const ids = z.array(uuid).max(50).safeParse(userIds);
  if (!uuid.safeParse(jobId).success || !ids.success) return { error: "Unknown job or person." };
  const supabase = await createClient();
  const { data: current } = await supabase.from("job_assignments").select("user_id").eq("job_id", jobId);
  const have = new Set((current ?? []).map((a) => a.user_id));
  const want = new Set(ids.data);
  const remove = [...have].filter((u) => !want.has(u));
  const add = [...want].filter((u) => !have.has(u));
  if (remove.length) {
    const { error } = await supabase.from("job_assignments").delete().eq("job_id", jobId).in("user_id", remove);
    if (error) return { error: dbErrorMessage(error, "Could not update who's assigned.") };
  }
  if (add.length) {
    const { error } = await supabase.from("job_assignments").insert(add.map((user_id) => ({ job_id: jobId, user_id, business_id: business.id })));
    if (error) return { error: dbErrorMessage(error, "Could not update who's assigned.") };
  }
  refresh();
  return {};
}
