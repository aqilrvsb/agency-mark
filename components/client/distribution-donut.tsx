interface DonutSlice {
  key: string;
  label: string;
  value: number;
}

const PALETTE = [
  "var(--color-orange)",      // primary
  "rgb(74 222 128)",          // emerald
  "rgb(96 165 250)",          // blue
  "rgb(251 191 36)",          // amber
  "rgb(244 114 182)",          // pink
  "rgb(167 139 250)",          // violet
];

const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const fmtMyr = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * Donut distribution widget — second column of the platform-page story row.
 * Pass slices already aggregated by category (e.g. by ad account, by status,
 * by platform). Renders an SVG donut with a centered total + legend below.
 */
export function DistributionDonut({
  title,
  slices,
  centerLabel = "Total",
  prefix = "RM ",
}: {
  title: string;
  slices: DonutSlice[];
  centerLabel?: string;
  prefix?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const filtered = slices.filter((s) => s.value > 0);

  return (
    <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-4 h-full flex flex-col">
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold mb-3">
        {title}
      </div>

      {filtered.length === 0 || total === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
          No data in this period.
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 flex-1 justify-center">
          <Donut slices={filtered} total={total} centerLabel={centerLabel} prefix={prefix} />
          <ul className="w-full space-y-1.5">
            {filtered.slice(0, 6).map((s, i) => {
              const pct = total > 0 ? (s.value / total) * 100 : 0;
              return (
                <li key={s.key} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ background: PALETTE[i % PALETTE.length] }}
                  />
                  <span className="truncate flex-1" title={s.label}>{s.label}</span>
                  <span className="font-mono text-[var(--color-text-muted)] whitespace-nowrap">
                    {fmtPct(pct)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Donut({
  slices,
  total,
  centerLabel,
  prefix,
}: {
  slices: DonutSlice[];
  total: number;
  centerLabel: string;
  prefix: string;
}) {
  const r = 36; // outer radius
  const stroke = 14;
  const cx = 50;
  const cy = 50;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="w-32 h-32" aria-hidden>
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={stroke}
      />
      {slices.map((s, i) => {
        const len = total > 0 ? (s.value / total) * circ : 0;
        const dasharray = `${len} ${circ - len}`;
        const dashoffset = -offset;
        offset += len;
        return (
          <circle
            key={s.key}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={stroke}
            strokeDasharray={dasharray}
            strokeDashoffset={dashoffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        );
      })}
      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        className="fill-current"
        style={{ fontSize: 12, fontWeight: 800 }}
      >
        {prefix}
        {fmtMyr(total)}
      </text>
      <text
        x={cx}
        y={cy + 9}
        textAnchor="middle"
        style={{ fontSize: 6, fill: "rgba(255,255,255,0.4)", letterSpacing: 1 }}
      >
        {centerLabel.toUpperCase()}
      </text>
    </svg>
  );
}
