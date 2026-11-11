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

/** `short` is how the answer is labelled for providers (e.g. "Bathrooms: 2"); `multiple` allows picking several. */
export type CategoryQuestion = { key: string; label: string; short: string; options: string[]; multiple?: boolean };

/** One or two optional quick-pick questions per service. Keys are stored in service_requests.details. */
export const categoryQuestions: Record<string, CategoryQuestion[]> = {
  "junk-removal": [{ key: "volume", label: "About how much?", short: "Amount", options: ["A few items", "Pickup-truck load", "Trailer load or more"] }],
  "lawn-mowing": [
    { key: "yard_size", label: "Yard size", short: "Yard", options: ["Small", "Medium", "Large"] },
    { key: "frequency", label: "How often?", short: "How often", options: ["One time", "Weekly", "Every 2 weeks"] },
  ],
  "pet-waste-pickup": [
    { key: "dogs", label: "How many dogs?", short: "Dogs", options: ["1", "2", "3 or more"] },
    { key: "frequency", label: "How often?", short: "How often", options: ["One time", "Weekly", "Twice a week"] },
  ],
  "pressure-washing": [{ key: "surfaces", label: "What needs washing?", short: "Surfaces", options: ["Driveway", "House siding", "Deck or patio", "Fence"], multiple: true }],
  "house-cleaning": [
    { key: "home_type", label: "Type of home", short: "Home", options: ["House", "Apartment", "Condo or townhome"] },
    { key: "size", label: "Size", short: "Size", options: ["Under 1,000 sq ft", "1,000–1,500 sq ft", "1,500–2,500 sq ft", "2,500–3,500 sq ft", "Over 3,500 sq ft"] },
    { key: "bedrooms", label: "Bedrooms", short: "Bedrooms", options: ["1", "2", "3", "4", "5+"] },
    { key: "bathrooms", label: "Bathrooms", short: "Bathrooms", options: ["1", "2", "3", "4+"] },
    { key: "rooms", label: "What needs cleaning? (pick all that apply)", short: "Clean", options: ["Whole home", "Kitchen", "Living room", "Bathrooms", "Bedrooms"], multiple: true },
    { key: "type", label: "Type of clean", short: "Type", options: ["Standard", "Deep clean", "Move-out"] },
  ],
  "turf-installation": [
    { key: "area", label: "About how big?", short: "Area", options: ["Under 500 sq ft", "500–1,000 sq ft", "1,000–2,500 sq ft", "Over 2,500 sq ft"] },
    { key: "current_ground", label: "What's there now?", short: "Now", options: ["Grass", "Dirt", "Gravel or rock", "Concrete"] },
    { key: "use", label: "Mainly for", short: "For", options: ["Front yard", "Back yard", "Pet area", "Putting green"] },
  ],
};

/** "Bathrooms: 2" style labels for a job's answers (older jobs may use keys no longer asked; those show the answer alone). */
export function detailLines(details: Record<string, string> | null | undefined): string[] {
  const shortOf = new Map(Object.values(categoryQuestions).flat().map((q) => [q.key, q.short]));
  return Object.entries(details ?? {}).map(([k, v]) => (shortOf.has(k) ? `${shortOf.get(k)}: ${v}` : v));
}

export const launchAreaName = "Austin, TX";

export const paymentMethodOptions = [
  { value: "card", label: "Card (through DoneZo)" },
  { value: "cash", label: "Cash" },
  { value: "venmo", label: "Venmo" },
  { value: "cash_app", label: "Cash App" },
  { value: "check", label: "Check" },
] as const;
export const paymentMethodName = (m: string) => paymentMethodOptions.find((o) => o.value === m)?.label.replace(" (through DoneZo)", "") ?? m;
