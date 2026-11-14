/** Provider ranks by completed jobs on HomeHire (owner decision 2026-11-14). */
export const RANKS = [
  { name: "Bronze", at: 5, color: "#b06a2c" },
  { name: "Silver", at: 25, color: "#8a94a6" },
  { name: "Gold", at: 50, color: "#d4a017" },
  { name: "Emerald", at: 100, color: "#1f9d6b" },
] as const;

export type RankProgress = {
  completed: number;
  current: (typeof RANKS)[number] | null;
  next: (typeof RANKS)[number] | null;
  toNext: number;
  /** 0–100: progress from the current rank (or 0) to the next one. */
  percent: number;
};

export function rankProgress(completed: number): RankProgress {
  const earned = RANKS.filter((r) => completed >= r.at);
  const current = earned[earned.length - 1] ?? null;
  const next = RANKS.find((r) => completed < r.at) ?? null;
  const from = current?.at ?? 0;
  const percent = next ? Math.round(((completed - from) / (next.at - from)) * 100) : 100;
  return { completed, current, next, toNext: next ? next.at - completed : 0, percent };
}
