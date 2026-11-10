import { z } from "zod";
import { parseMoneyToCents, zonedToUtcIso } from "@/lib/format";

const optionalUuid = z.union([z.literal(""), z.string().uuid()]).transform((v) => v || null);

export const jobFormSchema = z
  .object({
    customerId: z.string().uuid("Choose a customer."),
    addressId: optionalUuid,
    categoryId: optionalUuid,
    title: z.string().trim().min(1, "Give the job a short title.").max(120),
    description: z.string().trim().max(5000).transform((v) => v || null),
    price: z.string().trim(),
    date: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.")]),
    time: z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/, "Choose a time.")]),
    durationMinutes: z.coerce.number().int().min(5, "At least 5 minutes.").max(1440, "At most 24 hours."),
  })
  .superRefine((v, ctx) => {
    if (parseMoneyToCents(v.price || "0") === null) ctx.addIssue({ code: "custom", path: ["price"], message: "Enter a price like 45 or 45.50." });
    if (v.time && !v.date) ctx.addIssue({ code: "custom", path: ["date"], message: "Choose a date for this time." });
  });

export type JobFormValues = z.infer<typeof jobFormSchema>;

/** Turn validated form values into database columns, interpreting date/time in the business's time zone. */
export function jobColumns(v: JobFormValues, timeZone: string) {
  const start = v.date ? zonedToUtcIso(v.date, v.time || "09:00", timeZone) : null;
  const end = start ? new Date(new Date(start).getTime() + v.durationMinutes * 60_000).toISOString() : null;
  return {
    customer_id: v.customerId,
    address_id: v.addressId,
    category_id: v.categoryId,
    title: v.title,
    description: v.description,
    price_cents: parseMoneyToCents(v.price || "0")!,
    scheduled_start: start,
    scheduled_end: end,
  };
}
