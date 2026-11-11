import { z } from "zod";

export const uuid = z.string().uuid();

/** Optional text: missing, empty or blank all become null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((v) => v || null);

export const customerSchema = z.object({
  fullName: z.string().trim().min(1, "Enter the customer's name.").max(120),
  email: z
    .union([z.literal(""), z.string().trim().toLowerCase().email("Enter a valid email.").max(254)])
    .optional()
    .transform((v) => v || null),
  phone: optionalText(30),
  servicePreferences: optionalText(2000),
});

export const addressSchema = z.object({
  label: optionalText(60),
  line1: z.string().trim().min(1, "Enter the street address.").max(200),
  line2: optionalText(200),
  city: z.string().trim().min(1, "Enter the city.").max(100),
  state: z.string().trim().min(1, "Enter the state.").max(50),
  postalCode: z.string().trim().min(3, "Enter the ZIP code.").max(12),
  accessNotes: optionalText(1000),
});

/** Address fields are optional on the "new customer" form, but all-or-nothing. */
export function hasAnyAddress(fd: FormData) {
  return ["line1", "city", "state", "postalCode"].some((k) => String(fd.get(k) ?? "").trim() !== "");
}

export const noteSchema = z.object({ body: z.string().trim().min(1, "Write a note first.").max(5000) });
