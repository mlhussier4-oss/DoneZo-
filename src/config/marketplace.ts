/** Marketplace wording and optional per-service questions (Blueprint §4: optional, never long forms). */

export const timingOptions = [
  { value: "asap", label: "As soon as possible" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "within_3_days", label: "Within the next 3 days" },
  { value: "this_week", label: "Later this week" },
  { value: "specific_date", label: "Choose a date" },
] as const;
export type Timing = (typeof timingOptions)[number]["value"];
export const timingLabel = (t: string) => timingOptions.find((o) => o.value === t)?.label ?? t;

export type CategoryQuestion = { key: string; label: string; options: string[] };

/** One or two optional quick-pick questions per service. Keys are stored in service_requests.details. */
export const categoryQuestions: Record<string, CategoryQuestion[]> = {
  "junk-removal": [{ key: "volume", label: "About how much?", options: ["A few items", "Pickup-truck load", "Trailer load or more"] }],
  "lawn-mowing": [
    { key: "yard_size", label: "Yard size", options: ["Small", "Medium", "Large"] },
    { key: "frequency", label: "How often?", options: ["One time", "Weekly", "Every 2 weeks"] },
  ],
  "pet-waste-pickup": [
    { key: "dogs", label: "How many dogs?", options: ["1", "2", "3 or more"] },
    { key: "frequency", label: "How often?", options: ["One time", "Weekly", "Twice a week"] },
  ],
  "pressure-washing": [{ key: "surfaces", label: "What needs washing?", options: ["Driveway", "House siding", "Deck or patio", "Fence", "Several of these"] }],
  "house-cleaning": [
    { key: "bedrooms", label: "Bedrooms", options: ["1", "2", "3", "4+"] },
    { key: "type", label: "Type of clean", options: ["Standard", "Deep clean", "Move-out"] },
  ],
};

export const launchAreaName = "Austin, TX";

export const paymentMethodOptions = [
  { value: "card", label: "Card (through DoneZo)" },
  { value: "cash", label: "Cash" },
  { value: "venmo", label: "Venmo" },
  { value: "cash_app", label: "Cash App" },
  { value: "check", label: "Check" },
] as const;
export const paymentMethodName = (m: string) => paymentMethodOptions.find((o) => o.value === m)?.label.replace(" (through DoneZo)", "") ?? m;
