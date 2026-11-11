import { describe, expect, it } from "vitest";
import { addressSchema, customerSchema } from "./schemas";

describe("form schemas", () => {
  it("treats optional fields that aren't on the form as empty, not invalid", () => {
    const address = addressSchema.safeParse({ line1: "12 Oak St", city: "Springfield", state: "IL", postalCode: "62701" });
    expect(address.success).toBe(true);
    expect(address.data).toMatchObject({ label: null, line2: null, accessNotes: null });
    const customer = customerSchema.safeParse({ fullName: "Dana" });
    expect(customer.success).toBe(true);
    expect(customer.data).toMatchObject({ email: null, phone: null, servicePreferences: null });
  });
  it("still rejects bad values", () => {
    expect(customerSchema.safeParse({ fullName: "Dana", email: "not-an-email" }).success).toBe(false);
    expect(addressSchema.safeParse({ line1: "", city: "X", state: "IL", postalCode: "62701" }).success).toBe(false);
  });
});
