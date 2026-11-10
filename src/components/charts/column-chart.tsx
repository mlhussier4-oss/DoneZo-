/**
 * Single-series column chart in plain HTML/CSS.
 * Marks: columns capped at 24px wide, 4px rounded tops, square at the baseline,
 * one hairline baseline, a few clean y-ticks, value labelled only on the latest column.
 * Every column is a focusable hit target (the whole slot) with a tooltip on hover/focus,
 * and the same numbers are available as a table.
 */
export type ColumnDatum = { key: string; label: string; value: number; display: string };

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * pow >= max) return step * pow;
  return 10 * pow;
}

export function ColumnChart({
  data,
  formatTick,
  ariaLabel,
}: {
  data: ColumnDatum[];
  formatTick: (v: number) => string;
  ariaLabel: string;
}) {
  const top = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = [0, top / 2, top];
  const last = data[data.length - 1];

  return (
    <figure aria-label={ariaLabel} className="space-y-3">
      <div className="relative h-56 pl-12">
        {/* Gridlines + y ticks (recessive) */}
        {ticks.map((t) => (
          <div key={t} className="absolute right-0 left-12 border-t border-border" style={{ bottom: `${(t / top) * 100}%` }}>
            <span className="absolute -top-2 -left-12 w-10 text-right text-xs text-muted-foreground tabular-nums">{formatTick(t)}</span>
          </div>
        ))}
        <div className="absolute inset-y-0 right-0 left-12 flex items-end">
          {data.map((d) => {
            const pct = (d.value / top) * 100;
            return (
              <div
                key={d.key}
                tabIndex={0}
                role="img"
                aria-label={`${d.label}: ${d.display}`}
                className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none focus-visible:bg-primary-soft/60"
              >
                <div
                  className="w-full max-w-6 rounded-t bg-primary transition-opacity group-hover:opacity-80"
                  style={{ height: `${pct}%`, minHeight: d.value > 0 ? 2 : 0 }}
                />
                {d === last && d.value > 0 ? (
                  <span className="absolute text-xs font-medium text-foreground tabular-nums" style={{ bottom: `calc(${pct}% + 4px)` }}>
                    {d.display}
                  </span>
                ) : null}
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background shadow group-hover:block group-focus-visible:block"
                >
                  {d.label}: <strong>{d.display}</strong>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex pl-12">
        {data.map((d) => (
          <span key={d.key} className="flex-1 text-center text-xs text-muted-foreground">{d.label}</span>
        ))}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show as table</summary>
        <table className="mt-2 w-full max-w-sm">
          <tbody>
            {data.map((d) => (
              <tr key={d.key} className="border-b border-border">
                <td className="py-1.5">{d.label}</td>
                <td className="py-1.5 text-right tabular-nums">{d.display}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
