interface BreakdownItem {
  key: string;
  name: string;
  value: number;
}

const fmtMyr = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * Horizontal-bar breakdown widget — used in the "story row" of platform
 * pages (Campaigns / Ad Sets / Ads) to show the top N items by a single
 * metric (Spend by default).
 *
 * Visual: each row = name on the left + numeric value on the right, with
 * a thin progress bar underneath proportional to the row's share of the
 * page-leader's value (so the leader fills 100% of the track).
 */
export function TopBreakdownBars({
  title,
  items,
  prefix = "RM ",
  limit = 5,
}: {
  title: string;
  items: BreakdownItem[];
  prefix?: string;
  limit?: number;
}) {
  const visible = items
    .filter((i) => i.value > 0)
    .slice(0, limit);
  const max = visible[0]?.value ?? 0;

  return (
    <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-4 h-full flex flex-col">
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold mb-3">
        {title}
      </div>
      {visible.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
          No data in this period.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((it) => {
            const pct = max > 0 ? (it.value / max) * 100 : 0;
            return (
              <div key={it.key}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="text-xs font-bold truncate"
                    title={it.name}
                  >
                    {it.name}
                  </span>
                  <span className="text-xs font-mono font-bold whitespace-nowrap">
                    {prefix}
                    {fmtMyr(it.value)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-orange)]"
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
