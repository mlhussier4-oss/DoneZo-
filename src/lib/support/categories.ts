/** Topics people can choose when contacting support (stored in support_reports.category). */
export const supportCategories = [
  { value: "question", label: "A question about using HomeHire" },
  { value: "problem_with_job", label: "A problem with a job or booking" },
  { value: "payment", label: "Payments, fees or my subscription" },
  { value: "account", label: "My account or signing in" },
  { value: "privacy", label: "Privacy or my data (copy, correct or delete)" },
  { value: "safety", label: "Safety concern" },
  { value: "other", label: "Something else" },
] as const;

export const supportCategoryLabel = (v: string) => supportCategories.find((c) => c.value === v)?.label ?? "Other";
