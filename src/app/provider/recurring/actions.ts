"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { requirePro } from "@/lib/auth";
import { uuid } from "@/lib/crm/schemas";
import { parseMoneyToCents } from "@/lib/format";
import { dbErrorMessage, zodErrors, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const optionalUuid = z.union([z.literal(""), z.string().uuid()]).transform((v) => v || null);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.");

const schema = z
  .object({
    customerId: z.string().uuid("Choose a customer."),
    addressId: optionalUuid,
    categoryId: optionalUuid,
    title: z.string().trim().min(1, "Give the service a title.").max(120),
    description: z.string().trim().max(2000).transform((v) => v || null),
    price: z.string().trim(),
    frequency: z.enum(["weekly", "biweekly", "monthly", "custom"]),
    intervalDays: z.string().trim(),
    startDate: date,
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose a start time."),
    durationMinutes: z.coerce.number().int().min(5, "At least 5 minutes.").max(1440),
    endDate: z.union([z.literal(""), date]).transform((v) => v || null),
    defaultAssignee: optionalUuid.optional(),
  })
  .superRefine((v, ctx) => {
    if (parseMoneyToCents(v.price || "0") === null) ctx.addIssue({ code: "custom", path: ["price"], message: "Enter a price like 45 or 45.50." });
    if (v.frequency === "custom") {
      const n = Number(v.intervalDays);
      if (!Number.isInteger(n) || n < 1 || n > 365) ctx.addIssue({ code: "custom", path: ["intervalDays"], message: "Enter a number of days from 1 to 365." });
    }
    if (v.endDate && v.endDate < v.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "The end date must be after the start date." });
  });

function columns(v: z.infer<typeof schema>) {
  return {
    address_id: v.addressId,
    category_id: v.categoryId,
    title: v.title,
    description: v.description,
    price_cents: parseMoneyToCents(v.price || "0")!,
    frequency: v.frequency,
    interval_days: v.frequency === "custom" ? Number(v.intervalDays) : null,
    start_date: v.startDate,
    start_time: v.startTime,
    duration_minutes: v.durationMinutes,
    end_date: v.endDate,
    default_assignee: v.defaultAssignee ?? null,
  };
}

export async function createSchedule(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { business } = await requirePro();
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_schedules")
    .insert({ business_id: business.id, customer_id: parsed.data.customerId, ...columns(parsed.data) })
    .select("id")
    .single();
  if (error || !data) return { status: "error", message: dbErrorMessage(error, "Could not create the recurring service.") };
  redirect(`/provider/recurring/${data.id}`);
}

export async function updateSchedule(scheduleId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requirePro();
  if (!uuid.safeParse(scheduleId).success) return { status: "error", message: "Unknown service." };
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const supabase = await createClient();
  const { data: before } = await supabase.from("recurring_schedules").select("default_assignee, business_id").eq("id", scheduleId).single();
  const { error } = await supabase.from("recurring_schedules").update(columns(parsed.data)).eq("id", scheduleId);
  if (error) return { status: "error", message: dbErrorMessage(error, "Could not save changes.") };
  const next = parsed.data.defaultAssignee ?? null;
  if (before && before.default_assignee !== next) {
    // Hand the upcoming, untouched visits over to the new default person.
    const { data: upcoming } = await supabase.from("jobs").select("id")
      .eq("recurring_schedule_id", scheduleId).eq("is_detached", false).in("status", ["new", "scheduled"])
      .gte("scheduled_start", new Date().toISOString());
    const ids = (upcoming ?? []).map((j) => j.id);
    if (ids.length && before.default_assignee) await supabase.from("job_assignments").delete().in("job_id", ids).eq("user_id", before.default_assignee);
    if (ids.length && next) await supabase.from("job_assignments").upsert(ids.map((job_id) => ({ job_id, user_id: next, business_id: before.business_id })), { onConflict: "job_id,user_id", ignoreDuplicates: true });
  }
  refresh();
  return { status: "success", message: "Saved. Upcoming visits that haven't been started or changed by hand were updated." };
}

export async function setScheduleStatus(scheduleId: string, status: "active" | "paused" | "canceled"): Promise<void> {
  await requirePro();
  if (!uuid.safeParse(scheduleId).success || !["active", "paused", "canceled"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("recurring_schedules").update({ status }).eq("id", scheduleId);
  refresh();
}
