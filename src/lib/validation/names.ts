import { z } from "zod";

/** Customers give a first name only (owner decision 2026-11-13), so providers can't look them up elsewhere. */
export const firstNameSchema = z
  .string()
  .trim()
  .min(1, "Enter your first name.")
  .max(30, "Use 30 characters or fewer.")
  .regex(/^\p{L}[\p{L}'’.-]*$/u, "Just your first name, please (no last name).");
