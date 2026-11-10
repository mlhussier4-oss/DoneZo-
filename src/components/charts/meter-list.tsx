/** Name · bar · figure per row, bars aligned and scaled to the largest row (single hue). */
export function MeterList({ rows }: { rows: { name: string; value: number; display: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.name} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[10rem_1fr_auto]">
          <span className="truncate text-sm">{r.name}</span>
          <span className="order-last col-span-2 h-2.5 rounded-full bg-primary-soft sm:order-none sm:col-span-1">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="text-right text-sm font-medium tabular-nums">{r.display}</span>
        </li>
      ))}
    </ul>
  );
}
