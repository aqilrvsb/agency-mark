interface DailyPoint {
  date: string;
  value: number;
}

const fmtMyr = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * Compact single-metric line chart — first column of the platform-page
 * story row. Shows a metric's daily trend with the current total in the
 * top-right corner. Pure SVG, no JS deps.
 */
export function SingleMetricTrend({
  title,
  data,
  prefix = "",
  suffix = "",
  accent = "var(--color-orange)",
}: {
  title: string;
  data: DailyPoint[];
  prefix?: string;
  suffix?: string;
  accent?: string;
}) {
  const total = data.reduce((s, p) => s + p.value, 0);
  const max = Math.max(1, ...data.map((p) => p.value));

  const W = 320;
  const H = 100;
  const padX = 4;
  const padY = 6;

  const points =
    data.length > 1
      ? data
          .map((p, i) => {
            const x = padX + (i / (data.length - 1)) * (W - 2 * padX);
            const y = H - padY - (p.value / max) * (H - 2 * padY);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ")
      : "";

  // Area fill polygon (close to baseline)
  const area =
    data.length > 1
      ? `${padX},${H - padY} ${points} ${(W - padX).toFixed(1)},${H - padY}`
      : "";

  return (
    <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-4 h-full flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold">
            {title}
          </div>
          <div className="font-display font-extrabold text-2xl mt-0.5" style={{ color: accent }}>
            {prefix}
            {fmtMyr(total)}
            {suffix}
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
          No data in this period.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full mt-auto"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`grad-${title.replace(/\s/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          {area && (
            <polygon
              points={area}
              fill={`url(#grad-${title.replace(/\s/g, "-")})`}
            />
          )}
          {points && (
            <polyline
              points={points}
              fill="none"
              stroke={accent}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
        </svg>
      )}
    </div>
  );
}
