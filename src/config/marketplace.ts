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

/**
 * `short` is how the answer is labelled for providers (e.g. "Bathrooms: 2"); `multiple` allows picking several;
 * `text` makes it a small typed answer instead of bubbles (e.g. lawn dimensions "40 x 60").
 */
export type CategoryQuestion = {
  key: string; label: string; short: string; options: string[]; multiple?: boolean;
  text?: { placeholder: string; maxLength: number; zip?: boolean };
};

/** One or two optional quick-pick questions per service. Keys are stored in service_requests.details. */
export const categoryQuestions: Record<string, CategoryQuestion[]> = {
  "junk-removal": [{ key: "volume", label: "About how much?", short: "Amount", options: ["A few items", "Pickup-truck load", "Trailer load or more"] }],
  "lawn-mowing": [
    { key: "yard_size", label: "Yard size (mowed area)", short: "Yard", options: ["Small: under 3,000 sq ft", "Medium: 3,000–8,000 sq ft", "Large: 8,000–15,000 sq ft", "Extra large: over 15,000 sq ft (⅓ acre+)"] },
    { key: "dimensions", label: "Yard dimensions in feet, if you know them", short: "Dimensions", options: [], text: { placeholder: "e.g. 40 x 60", maxLength: 60 } },
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
  moving: [
    { key: "items", label: "About how many items?", short: "Items", options: ["1–5 items", "6–15 items", "16–30 items", "Whole home (30+ items)"] },
    { key: "pickup_stairs", label: "Stairs at pickup", short: "Pickup stairs", options: ["Ground floor or elevator", "1 flight", "2 flights", "3+ flights"] },
    { key: "pickup_zip", label: "Pickup ZIP code", short: "Pickup ZIP", options: [], text: { placeholder: "e.g. 78704", maxLength: 5, zip: true } },
    { key: "delivery_stairs", label: "Stairs at delivery", short: "Delivery stairs", options: ["Ground floor or elevator", "1 flight", "2 flights", "3+ flights"] },
    { key: "delivery_zip", label: "Delivery ZIP code", short: "Delivery ZIP", options: [], text: { placeholder: "e.g. 78745", maxLength: 5, zip: true } },
  ],
  "car-detailing": [
    { key: "vehicle", label: "Type of vehicle", short: "Vehicle", options: ["Car", "SUV or crossover", "Pickup truck", "Minivan or van"] },
    { key: "vehicles", label: "How many vehicles?", short: "Vehicles", options: ["1", "2", "3 or more"] },
    { key: "package", label: "What do you need?", short: "Service", options: ["Interior detail", "Exterior detail", "Both"] },
    { key: "condition", label: "How dirty is it?", short: "Condition", options: ["Light", "Average", "Very dirty (pet hair, stains)"] },
    { key: "hookups", label: "At your place, is there…", short: "At home", options: ["Water and power", "Power only", "Neither"] },
  ],
};

/** "Bathrooms: 2" style labels for a job's answers (older jobs may use keys no longer asked; those show the answer alone). */
export function detailLines(details: Record<string, string> | null | undefined): string[] {
  const shortOf = new Map(Object.values(categoryQuestions).flat().map((q) => [q.key, q.short]));
  return Object.entries(details ?? {}).map(([k, v]) => {
    const area = k === "dimensions" ? areaFromDimensions(v) : null;
    const value = area ? `${v} (≈ ${area.toLocaleString("en-US")} sq ft)` : v;
    return shortOf.has(k) ? `${shortOf.get(k)}: ${value}` : value;
  });
}

/** "15 x 25", "15x25 ft", "15 by 25" → 375 (square feet), or null if it isn't width × length. */
export function areaFromDimensions(text: string): number | null {
  const m = text.toLowerCase().replace(/,/g, "").match(/^\s*(\d+(?:\.\d+)?)\s*(?:'|ft|feet)?\s*(?:x|×|\*|by)\s*(\d+(?:\.\d+)?)\s*(?:'|ft|feet)?\s*$/);
  if (!m) return null;
  const sq = Number(m[1]) * Number(m[2]);
  return sq > 0 && sq < 1_000_000 ? Math.round(sq) : null;
}

/** Repeat visits with the same provider (owner decision 2026-11-12). */
export const REPEAT_FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
] as const;
export const frequencyLabel = (f: string) => REPEAT_FREQUENCIES.find((x) => x.value === f)?.label ?? f;

export const launchAreaName = "Austin, TX";

export const paymentMethodOptions = [
  { value: "card", label: "Card (through HomeHire)" },
  { value: "cash", label: "Cash" },
  { value: "venmo", label: "Venmo" },
  { value: "cash_app", label: "Cash App" },
  { value: "check", label: "Check" },
] as const;
export const paymentMethodName = (m: string) => paymentMethodOptions.find((o) => o.value === m)?.label.replace(" (through HomeHire)", "") ?? m;
