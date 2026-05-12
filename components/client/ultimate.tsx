/**
 * Ultimate reporting primitives — shared design system for the client-portal
 * paid-ads dashboards (Facebook / TikTok / Google).
 *
 * Distilled from research across AgencyAnalytics, Whatagraph, NinjaCat,
 * Vercel Analytics, Linear Insights, Stripe Dashboard, Triple Whale,
 * Northbeam, Motion, Optmyzr — and Edward Tufte / Stephen Few /
 * Cole Knaflic / Andy Cotgreave dashboard-design canon.
 *
 * Theme: dark canvas (#0a0a0a), card (#161616), border (#262626),
 * yellow accent (#a855f7) reserved for the hero metric only.
 *
 * Server-rendered. No client-side JS unless explicitly noted.
 */

import type { AggregateRow } from "@/lib/client-data/aggregate";

// ---------------------------------------------------------------- formatters

export const NUM = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export const KSHORT = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 10_000
    ? `${(n / 1_000).toFixed(1)}K`
    : NUM(n);

export const MYR = (n: number) =>
  `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const MYR_COMPACT = (n: number) =>
  n >= 1_000_000
    ? `RM ${(n / 1_000_000).toFixed(2)}M`
    : n >= 10_000
    ? `RM ${(n / 1_000).toFixed(1)}K`
    : MYR(n);

export const PCT = (n: number) => `${n.toFixed(2)}%`;
export const PCT1 = (n: number) => `${n.toFixed(1)}%`;
export const X = (n: number) => `${n.toFixed(2)}×`;
export const DASH = "—";

export function shortMonthDay(iso: string): string {
  const d = new Date(iso);
  const m = d.toLocaleString("en-US", { month: "short" });
  return `${d.getDate()} ${m}`;
}

// ----------------------------------------------------------------- delta arrow

export function DeltaArrow({
  value,
  invert = false,
  hideOnZero = true,
}: {
  /** Percent delta. Positive = up, negative = down. */
  value: number | null | undefined;
  /** When true, "up" is bad (e.g. CPA, CPM, frequency) so down=green */
  invert?: boolean;
  hideOnZero?: boolean;
}) {
  if (value == null || (hideOnZero && Math.abs(value) < 0.5)) return null;
  const up = value > 0;
  const good = invert ? !up : up;
  const color = good ? "text-emerald-400" : "text-rose-400";
  const arrow = up ? "▲" : "▼";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${color}`}>
      <span className="leading-none">{arrow}</span>
      <span>{Math.abs(value).toFixed(1)}%</span>
    </span>
  );
}

// ----------------------------------------------------------------- sparkline

export function Sparkline({
  data,
  color = "#a855f7",
  height = 28,
  className = "",
}: {
  data: { value: number }[];
  color?: string;
  height?: number;
  className?: string;
}) {
  if (data.length < 2) {
    return <div className={`h-[${height}px] ${className}`} />;
  }
  const W = 100;
  const H = height;
  const max = Math.max(1, ...data.map((p) => p.value));
  const min = Math.min(0, ...data.map((p) => p.value));
  const range = Math.max(1, max - min);

  const points = data
    .map((p, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - 2 - ((p.value - min) / range) * (H - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height }}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// -------------------------------------------------------------- section title

export function Section({
  title,
  hint,
  action,
  children,
  className = "",
}: {
  title?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-6 sm:mb-8 ${className}`}>
      {(title || hint || action) && (
        <header className="flex items-end justify-between gap-3 mb-3 sm:mb-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--color-text-primary)] leading-tight">
                {title}
              </h2>
            )}
            {hint && (
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-0.5 truncate">
                {hint}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

// -------------------------------------------------------------- status pill

export function StatusPill({
  variant,
  label,
}: {
  variant: "positive" | "warning" | "danger" | "neutral" | "info";
  label: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-tight ring-1 ring-inset";
  const tone = {
    positive: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
    danger: "bg-rose-500/10 text-rose-300 ring-rose-500/20",
    neutral: "bg-white/[0.04] text-[var(--color-text-secondary)] ring-white/10",
    info: "bg-sky-500/10 text-sky-300 ring-sky-500/20",
  }[variant];
  const dot = {
    positive: "bg-emerald-400",
    warning: "bg-amber-400",
    danger: "bg-rose-400",
    neutral: "bg-[var(--color-text-muted)]",
    info: "bg-sky-400",
  }[variant];
  return (
    <span className={`${base} ${tone}`}>
      <span className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// -------------------------------------------------------------- KPI tile

export interface KpiTileProps {
  label: string;
  value: string;
  delta?: number | null;
  /** True when up=bad (CPA, CPM, frequency). Default false (up=good). */
  invertDelta?: boolean;
  spark?: { value: number }[];
  hint?: string;
}

export function KpiTile({ label, value, delta, invertDelta, spark, hint }: KpiTileProps) {
  const up = (delta ?? 0) > 0;
  const goodDelta = invertDelta ? !up : up;
  const sparkColor =
    delta == null
      ? "#a855f7"
      : Math.abs(delta) < 0.5
      ? "#737373"
      : goodDelta
      ? "#34d399"
      : "#fb7185";

  return (
    <div className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 sm:p-4 transition-colors hover:border-[var(--color-border-bright)]">
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)] truncate"
          title={label}
        >
          {label}
        </span>
        {delta != null && <DeltaArrow value={delta} invert={invertDelta} />}
      </div>
      <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-semibold tabular-nums tracking-tight leading-none text-[var(--color-text-primary)]">
        {value}
      </div>
      {spark && spark.length > 1 && (
        <div className="mt-2.5 sm:mt-3 -mb-0.5">
          <Sparkline data={spark} color={sparkColor} height={22} />
        </div>
      )}
      {hint && (
        <p className="mt-2 text-[10px] text-[var(--color-text-muted)] truncate">{hint}</p>
      )}
    </div>
  );
}

// ----------------------------------------------------------- HeroMetricCard
//
// The "showstopper" — giant number with conic-gradient yellow ring +
// text-shadow glow. Used ONCE per page for the north-star metric.

export function HeroMetricCard({
  label,
  value,
  delta,
  invertDelta,
  caption,
  spark,
}: {
  label: string;
  value: string;
  delta?: number | null;
  invertDelta?: boolean;
  caption?: string;
  spark?: { value: number }[];
}) {
  return (
    <div className="relative rounded-2xl">
      <div
        aria-hidden
        className="absolute -inset-px rounded-2xl opacity-30 blur-[2px] motion-reduce:hidden"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, #a855f7 60deg, transparent 140deg)",
          animation: "ad-hero-spin 9s linear infinite",
        }}
      />
      <div className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 sm:p-6 lg:p-8 overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            {label}
          </span>
          {delta != null && <DeltaArrow value={delta} invert={invertDelta} />}
        </div>
        <div
          className="mt-3 sm:mt-4 text-4xl sm:text-5xl lg:text-6xl font-semibold tabular-nums tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-400"
          style={{ textShadow: "0 0 60px rgba(250, 204, 21, 0.25)" }}
        >
          {value}
        </div>
        {caption && (
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {caption}
          </p>
        )}
        {spark && spark.length > 1 && (
          <div className="mt-4">
            <Sparkline data={spark} color="#a855f7" height={36} />
          </div>
        )}
      </div>
      <style>{"@keyframes ad-hero-spin { to { transform: rotate(360deg) } }"}</style>
    </div>
  );
}

// --------------------------------------------------------- DualAxisTrend
//
// Spend (filled area, muted) vs Revenue/Conversions (solid line, accent).
// Optional `referenceY` line (e.g. break-even ROAS or Target CPA).

export interface DualAxisTrendDatum {
  date: string;
  primary: number; // left axis (e.g. spend)
  secondary: number; // right axis (e.g. revenue)
}

export function DualAxisTrend({
  data,
  primaryLabel,
  secondaryLabel,
  primaryFormat = NUM,
  secondaryFormat = NUM,
  height = 240,
  referenceLabel,
}: {
  data: DualAxisTrendDatum[];
  primaryLabel: string;
  secondaryLabel: string;
  primaryFormat?: (n: number) => string;
  secondaryFormat?: (n: number) => string;
  height?: number;
  referenceLabel?: string;
}) {
  const W = 800;
  const H = height;
  const padL = 44;
  const padR = 44;
  const padT = 24;
  const padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium tracking-tight text-[var(--color-text-secondary)]">
            {primaryLabel} <span className="text-[var(--color-text-muted)]">vs</span>{" "}
            <span className="text-emerald-400">{secondaryLabel}</span>
          </div>
        </div>
        <div className="flex items-center justify-center text-xs text-[var(--color-text-muted)]" style={{ height }}>
          Not enough data points to plot a trend.
        </div>
      </div>
    );
  }

  const primMax = Math.max(1, ...data.map((d) => d.primary));
  const secMax = Math.max(1, ...data.map((d) => d.secondary));

  const primPath = data
    .map((d, i) => {
      const x = padL + (i / (data.length - 1)) * innerW;
      const y = padT + innerH - (d.primary / primMax) * innerH;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const primArea =
    `M ${padL} ${padT + innerH} ` +
    data
      .map((d, i) => {
        const x = padL + (i / (data.length - 1)) * innerW;
        const y = padT + innerH - (d.primary / primMax) * innerH;
        return `L ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ") +
    ` L ${padL + innerW} ${padT + innerH} Z`;

  const secLine = data
    .map((d, i) => {
      const x = padL + (i / (data.length - 1)) * innerW;
      const y = padT + innerH - (d.secondary / secMax) * innerH;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const yTicks = 4;
  const yLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const y = padT + innerH - (i / yTicks) * innerH;
    const primV = (primMax * i) / yTicks;
    const secV = (secMax * i) / yTicks;
    return { y, primV, secV };
  });
  const xTickIdx = [0, Math.floor(data.length / 3), Math.floor((2 * data.length) / 3), data.length - 1];

  const totalPrimary = data.reduce((s, d) => s + d.primary, 0);
  const totalSecondary = data.reduce((s, d) => s + d.secondary, 0);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 sm:p-5 lg:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3 sm:mb-4">
        <div className="flex items-center gap-4 sm:gap-5 flex-wrap min-w-0">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm bg-yellow-400/40 ring-1 ring-yellow-400/60" />
            <span className="text-xs sm:text-sm text-[var(--color-text-secondary)] tracking-tight">
              {primaryLabel}
            </span>
            <span className="text-xs sm:text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
              {primaryFormat(totalPrimary)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs sm:text-sm text-[var(--color-text-secondary)] tracking-tight">
              {secondaryLabel}
            </span>
            <span className="text-xs sm:text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
              {secondaryFormat(totalSecondary)}
            </span>
          </div>
          {referenceLabel && (
            <div className="flex items-center gap-2">
              <span className="block w-3 h-px border-t border-dashed border-rose-400" />
              <span className="text-[11px] text-[var(--color-text-muted)]">{referenceLabel}</span>
            </div>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id="primAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yLines.map((t, i) => (
          <g key={i}>
            <line
              x1={padL}
              y1={t.y}
              x2={W - padR}
              y2={t.y}
              stroke="#262626"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <text
              x={padL - 6}
              y={t.y + 4}
              fontSize="10"
              textAnchor="end"
              fill="#737373"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {primaryFormat(t.primV)}
            </text>
            <text
              x={W - padR + 6}
              y={t.y + 4}
              fontSize="10"
              textAnchor="start"
              fill="#737373"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {secondaryFormat(t.secV)}
            </text>
          </g>
        ))}
        {xTickIdx.map((i, k) => {
          const x = padL + (i / Math.max(1, data.length - 1)) * innerW;
          return (
            <text
              key={k}
              x={x}
              y={H - 10}
              fontSize="10"
              textAnchor="middle"
              fill="#737373"
            >
              {shortMonthDay(data[i].date)}
            </text>
          );
        })}
        <path d={primArea} fill="url(#primAreaGrad)" />
        <path d={primPath} fill="none" stroke="#a855f7" strokeOpacity="0.7" strokeWidth={1.5} strokeLinejoin="round" />
        <path d={secLine} fill="none" stroke="#34d399" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ----------------------------------------------------------- ContributionBars
//
// "Top contributors" horizontal bar list. Replaces AgencyAnalytics's
// generic clicks-by-name card with a richer view: name + value + bar +
// share-of-total chip.

export function ContributionBars({
  title,
  total,
  rows,
  formatValue = NUM,
  shareSuffix = "of total",
  emptyText = "No data in this period.",
  href,
}: {
  title: string;
  total: number;
  rows: { name: string; value: number; sub?: string; href?: string }[];
  formatValue?: (n: number) => string;
  shareSuffix?: string;
  emptyText?: string;
  href?: string;
}) {
  const top = rows.slice(0, 5);
  const max = Math.max(1, ...top.map((r) => r.value));
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 sm:p-5 lg:p-6 flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
        <h3 className="text-sm font-medium tracking-tight text-[var(--color-text-secondary)]">{title}</h3>
        {href && (
          <a href={href} className="text-[11px] text-[var(--color-orange)] hover:opacity-80">
            See all →
          </a>
        )}
      </div>
      {top.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[var(--color-text-muted)] py-12">
          {emptyText}
        </div>
      ) : (
        <ul className="flex flex-col gap-3 sm:gap-4">
          {top.map((r, i) => {
            const pct = (r.value / max) * 100;
            const share = total > 0 ? (r.value / total) * 100 : 0;
            return (
              <li key={i}>
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <div className="text-[13px] text-[var(--color-text-primary)] truncate">
                      {r.href ? (
                        <a href={r.href} className="hover:underline underline-offset-2 decoration-[var(--color-orange)]/50">
                          {r.name}
                        </a>
                      ) : (
                        r.name
                      )}
                    </div>
                    {r.sub && (
                      <div className="text-[10px] text-[var(--color-text-muted)] truncate">{r.sub}</div>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 shrink-0">
                    <span className="text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {formatValue(r.value)}
                    </span>
                    {total > 0 && (
                      <span className="text-[10px] tabular-nums text-[var(--color-text-muted)]">
                        {share.toFixed(0)}% {shareSuffix}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background:
                        i === 0
                          ? "linear-gradient(90deg, #a855f7 0%, #c084fc 100%)"
                          : "rgba(250, 204, 21, 0.45)",
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------- NarrativeCard
//
// Rule-based "what changed since last period" sentence. Static — no LLM
// (per CLAUDE.md note 3, AINarrativeCard placeholder pattern).

export function NarrativeCard({
  brandName,
  totals,
  deltas,
  range,
  topRow,
}: {
  brandName?: string;
  totals: { spend: number; revenue: number; conversions: number; roas: number; cpa: number };
  deltas: { spend: number; revenue: number; conversions: number; roas: number; cpa: number };
  range: { days: number };
  topRow?: AggregateRow | null;
}) {
  const days = range.days;
  const spentMore = deltas.spend > 5;
  const earnedMore = deltas.revenue > 5;
  const roasUp = deltas.roas > 5;
  const roasDown = deltas.roas < -5;
  const flatBudget = Math.abs(deltas.spend) <= 5;

  const headline = (() => {
    if (totals.spend === 0) return "No paid-ad activity in this period yet.";
    if (totals.revenue > 0 && roasUp && earnedMore) {
      return `Strong ${days}-day window — ROAS climbed to ${totals.roas.toFixed(2)}× while revenue grew faster than spend.`;
    }
    if (totals.revenue > 0 && roasDown) {
      return `ROAS slipped to ${totals.roas.toFixed(2)}× — efficiency tightened over the last ${days} days.`;
    }
    if (flatBudget && earnedMore) {
      return `Same budget, more results — revenue up ${deltas.revenue.toFixed(0)}% on flat spend.`;
    }
    if (totals.conversions > 0 && deltas.conversions > 0) {
      return `${NUM(totals.conversions)} conversion${totals.conversions === 1 ? "" : "s"} captured over ${days} days, ${deltas.conversions > 0 ? "up" : "down"} ${Math.abs(deltas.conversions).toFixed(0)}% vs prior period.`;
    }
    return `${MYR_COMPACT(totals.spend)} spent over ${days} days${spentMore ? `, ${deltas.spend.toFixed(0)}% more than last period` : ""}.`;
  })();

  const detail = (() => {
    const bits: string[] = [];
    if (totals.revenue > 0) {
      bits.push(`generated ${MYR_COMPACT(totals.revenue)} in revenue`);
    } else if (totals.conversions > 0) {
      bits.push(`drove ${NUM(totals.conversions)} conversion${totals.conversions === 1 ? "" : "s"}`);
    }
    if (totals.cpa > 0) {
      const cpaArrow = deltas.cpa < -2 ? "down" : deltas.cpa > 2 ? "up" : "flat";
      bits.push(`cost-per-result ${cpaArrow === "flat" ? "held at" : cpaArrow}${cpaArrow === "flat" ? "" : ""} ${MYR(totals.cpa)}${cpaArrow !== "flat" ? ` (${Math.abs(deltas.cpa).toFixed(0)}% ${cpaArrow})` : ""}`);
    }
    if (topRow && topRow.spend > 0) {
      bits.push(`top performer was "${topRow.name}" at ${topRow.roas > 0 ? `${topRow.roas.toFixed(2)}× ROAS` : `${MYR_COMPACT(topRow.spend)} spend`}`);
    }
    return bits.length > 0
      ? bits.join("; ").charAt(0).toUpperCase() + bits.join("; ").slice(1) + "."
      : null;
  })();

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 sm:p-5 lg:p-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] uppercase tracking-[0.08em] font-medium text-[var(--color-orange)]">
          {brandName ? `${brandName} · ` : ""}{days}-day story
        </span>
      </div>
      <p className="text-[15px] sm:text-base text-[var(--color-text-primary)] leading-snug font-medium tracking-tight">
        {headline}
      </p>
      {detail && (
        <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">{detail}</p>
      )}
    </div>
  );
}

// ----------------------------------------------------------- InsightCard
//
// Auto-derived insights surface — top-of-page strip OR feed page.

export type InsightVariant =
  | "positive"
  | "negative"
  | "neutral"
  | "opportunity"
  | "threat"
  | "milestone";

export interface Insight {
  id: string;
  variant: InsightVariant;
  /** 1 (info) → 5 (urgent) */
  severity: 1 | 2 | 3 | 4 | 5;
  headline: string;
  body?: string;
  evidence?: { label: string; href?: string }[];
}

const VARIANT_TONE: Record<
  InsightVariant,
  { ring: string; bg: string; chip: string; bar: string }
> = {
  positive: {
    ring: "ring-emerald-500/20",
    bg: "bg-emerald-500/[0.07]",
    chip: "text-emerald-300",
    bar: "bg-emerald-400",
  },
  negative: {
    ring: "ring-rose-500/20",
    bg: "bg-rose-500/[0.07]",
    chip: "text-rose-300",
    bar: "bg-rose-400",
  },
  threat: {
    ring: "ring-amber-500/20",
    bg: "bg-amber-500/[0.07]",
    chip: "text-amber-300",
    bar: "bg-amber-400",
  },
  opportunity: {
    ring: "ring-sky-500/20",
    bg: "bg-sky-500/[0.07]",
    chip: "text-sky-300",
    bar: "bg-sky-400",
  },
  milestone: {
    ring: "ring-violet-500/20",
    bg: "bg-violet-500/[0.07]",
    chip: "text-violet-300",
    bar: "bg-violet-400",
  },
  neutral: {
    ring: "ring-white/10",
    bg: "bg-white/[0.03]",
    chip: "text-[var(--color-text-secondary)]",
    bar: "bg-[var(--color-text-muted)]",
  },
};

export function InsightCard({ insight }: { insight: Insight }) {
  const tone = VARIANT_TONE[insight.variant];
  const label =
    insight.variant === "positive"
      ? "Win"
      : insight.variant === "negative"
      ? "Issue"
      : insight.variant === "threat"
      ? "Watch"
      : insight.variant === "opportunity"
      ? "Opportunity"
      : insight.variant === "milestone"
      ? "Milestone"
      : "Note";
  return (
    <article
      className={`relative overflow-hidden rounded-xl border border-[var(--color-border)] ${tone.bg} ring-1 ring-inset ${tone.ring} p-4 sm:p-5 min-w-[260px] sm:min-w-[320px] max-w-md flex flex-col gap-2`}
    >
      <div className={`absolute inset-y-0 left-0 w-[3px] ${tone.bar}`} />
      <div className="flex items-center gap-2">
        <span
          className={`text-[10px] font-medium uppercase tracking-[0.08em] ${tone.chip}`}
        >
          {label}
        </span>
      </div>
      <h4 className="text-sm sm:text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)] leading-snug">
        {insight.headline}
      </h4>
      {insight.body && (
        <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {insight.body}
        </p>
      )}
      {insight.evidence && insight.evidence.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {insight.evidence.map((e, i) =>
            e.href ? (
              <a
                key={i}
                href={e.href}
                className="text-[10px] rounded-md px-2 py-1 bg-white/[0.04] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-bright)]"
              >
                {e.label}
              </a>
            ) : (
              <span
                key={i}
                className="text-[10px] rounded-md px-2 py-1 bg-white/[0.04] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
              >
                {e.label}
              </span>
            )
          )}
        </div>
      )}
    </article>
  );
}

export function InsightStrip({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <div className="-mx-4 sm:mx-0">
      <div className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide px-4 sm:px-0 pb-2 snap-x snap-mandatory">
        {insights.map((i) => (
          <div key={i.id} className="snap-start shrink-0">
            <InsightCard insight={i} />
          </div>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------- deriveInsights
//
// Rule-based insight detector. Pure function over the data we already
// load in fetch-brand-data.ts — no extra DB calls.

export interface DeriveInsightsInput {
  totals: {
    spend: number;
    revenue: number;
    conversions: number;
    clicks: number;
    impressions: number;
    cpa: number;
    roas: number;
    ctr: number;
    cpc: number;
    cpm: number;
    frequency: number;
  };
  priorTotals: {
    spend: number;
    revenue: number;
    conversions: number;
    cpa: number;
    roas: number;
    ctr: number;
    frequency: number;
  };
  deltas: {
    spend: number;
    revenue: number;
    conversions: number;
    cpa: number;
    roas: number;
    ctr: number;
  };
  rows: AggregateRow[];
  daily: { date: string; spend: number; revenue: number }[];
  rangeDays: number;
}

export function deriveInsights(input: DeriveInsightsInput): Insight[] {
  const out: Insight[] = [];
  const { totals, priorTotals, deltas, rows, daily, rangeDays } = input;
  if (totals.spend === 0) return out;

  // 1. ROAS erosion
  if (totals.roas > 0 && priorTotals.roas > 0 && deltas.roas <= -15 && totals.spend > 100) {
    out.push({
      id: "roas-erosion",
      variant: "negative",
      severity: 4,
      headline: `ROAS dropped from ${priorTotals.roas.toFixed(2)}× to ${totals.roas.toFixed(2)}× (${deltas.roas.toFixed(0)}%)`,
      body: `Same window last period, your ads earned RM ${priorTotals.roas.toFixed(2)} for every RM 1 spent. This period it's RM ${totals.roas.toFixed(2)} — efficiency is slipping while spend stays in range.`,
    });
  }

  // 2. ROAS lift (positive)
  if (totals.roas > 1 && priorTotals.roas > 0 && deltas.roas >= 15) {
    out.push({
      id: "roas-lift",
      variant: "positive",
      severity: 2,
      headline: `ROAS climbed to ${totals.roas.toFixed(2)}× (+${deltas.roas.toFixed(0)}%)`,
      body: `Up from ${priorTotals.roas.toFixed(2)}× last period — your media mix is working harder.`,
    });
  }

  // 3. Spend spike (yesterday vs trailing-7d median)
  if (daily.length >= 8) {
    const last = daily[daily.length - 1];
    const trailing7 = daily.slice(-8, -1).map((d) => d.spend);
    const med = median(trailing7);
    if (med > 0 && last.spend > med * 2 && last.spend > 50) {
      out.push({
        id: "spend-spike",
        variant: "threat",
        severity: 3,
        headline: `Spend on ${shortMonthDay(last.date)} was ${(last.spend / med).toFixed(1)}× the 7-day median`,
        body: `${MYR(last.spend)} burned in a single day vs ${MYR(med)} typical. Worth a sanity-check.`,
      });
    }
  }

  // 4. Best performer
  const performers = rows.filter((r) => r.spend > 0).sort((a, b) => b.roas - a.roas);
  const top = performers[0];
  if (top && top.roas >= 2 && top.spend > 30) {
    out.push({
      id: "best-perf",
      variant: "opportunity",
      severity: 2,
      headline: `"${top.name}" is your best performer at ${top.roas.toFixed(2)}× ROAS`,
      body: `${MYR_COMPACT(top.spend)} spent → ${MYR_COMPACT(top.revenue)} earned. Worth scaling budget while it lasts.`,
      evidence: [{ label: top.name }],
    });
  }

  // 5. Wasted spend (campaign with cost > X and 0 conv)
  const wasted = rows
    .filter((r) => r.spend > 50 && r.conversions === 0 && r.clicks > 0)
    .sort((a, b) => b.spend - a.spend)[0];
  if (wasted) {
    out.push({
      id: "wasted-spend",
      variant: "negative",
      severity: 3,
      headline: `${MYR_COMPACT(wasted.spend)} spent on "${wasted.name}" with no conversions`,
      body: `${NUM(wasted.clicks)} clicks but zero results — landing-page or audience-fit issue worth investigating.`,
      evidence: [{ label: wasted.name }],
    });
  }

  // 6. Pacing — if spend is up >40% with conversions flat
  if (deltas.spend > 40 && Math.abs(deltas.conversions) < 10 && totals.spend > 200) {
    out.push({
      id: "pacing",
      variant: "threat",
      severity: 3,
      headline: `Spend up ${deltas.spend.toFixed(0)}% but conversions barely moved`,
      body: `Either CPMs jumped or audience saturated — review the auction-pressure trend before next budget bump.`,
    });
  }

  // 7. Milestone — first revenue day
  if (totals.revenue > 0 && priorTotals.revenue === 0 && rangeDays <= 60) {
    out.push({
      id: "first-revenue",
      variant: "milestone",
      severity: 2,
      headline: `First period with attributed revenue — ${MYR_COMPACT(totals.revenue)} earned`,
      body: `From ${MYR_COMPACT(totals.spend)} spent. Pixel firing and attribution windows are working.`,
    });
  }

  // 8. CTR collapse
  if (totals.ctr > 0 && priorTotals.ctr > 0 && deltas.ctr <= -25 && totals.impressions > 5000) {
    out.push({
      id: "ctr-collapse",
      variant: "threat",
      severity: 3,
      headline: `CTR fell ${Math.abs(deltas.ctr).toFixed(0)}% — creative is fatiguing`,
      body: `From ${PCT(priorTotals.ctr)} to ${PCT(totals.ctr)}. Time to refresh hooks or rotate creatives.`,
    });
  }

  // Severity-sort, cap to 6 strongest
  return out.sort((a, b) => b.severity - a.severity).slice(0, 6);
}

function median(xs: number[]) {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// --------------------------------------------------------- CreativeWall
//
// TikTok hero — 9:16 thumbnail grid sorted by ROAS (or spend if no
// revenue attributed). Each card shows performance ring + 4 metrics.

export function CreativeWall({
  rows,
  emptyText = "No ads with data in this period.",
}: {
  rows: AggregateRow[];
  emptyText?: string;
}) {
  const ads = rows
    .filter((r) => r.spend > 0)
    .sort((a, b) => (b.roas > 0 || a.roas > 0 ? b.roas - a.roas : b.spend - a.spend))
    .slice(0, 6);

  if (ads.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center text-sm text-[var(--color-text-muted)]">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {ads.map((ad) => {
        const score = adScore(ad);
        const ringColor =
          score >= 70 ? "#34d399" : score >= 40 ? "#a855f7" : "#fb7185";
        return (
          <div
            key={ad.key}
            className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden flex flex-col transition-colors hover:border-[var(--color-border-bright)]"
          >
            <div className="relative aspect-[9/16] bg-[var(--color-bg-soft)] overflow-hidden">
              {ad.creativeThumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ad.creativeThumbnail}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-muted)] text-[10px] tracking-wider uppercase">
                  No preview
                </div>
              )}
              <div className="absolute top-2 right-2">
                <ScoreRing score={score} color={ringColor} />
              </div>
            </div>
            <div className="p-2.5 sm:p-3 flex flex-col gap-1.5">
              <div className="text-[11px] font-medium text-[var(--color-text-primary)] truncate" title={ad.name}>
                {ad.name}
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px] tabular-nums">
                <div>
                  <div className="text-[var(--color-text-muted)] uppercase tracking-wider text-[9px]">ROAS</div>
                  <div className="text-[var(--color-text-primary)] font-semibold">
                    {ad.roas > 0 ? X(ad.roas) : DASH}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--color-text-muted)] uppercase tracking-wider text-[9px]">Spend</div>
                  <div className="text-[var(--color-text-primary)] font-semibold">
                    {MYR_COMPACT(ad.spend)}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--color-text-muted)] uppercase tracking-wider text-[9px]">CTR</div>
                  <div className="text-[var(--color-text-primary)] font-semibold">
                    {ad.impressions > 0 ? PCT1(ad.ctr) : DASH}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--color-text-muted)] uppercase tracking-wider text-[9px]">CPA</div>
                  <div className="text-[var(--color-text-primary)] font-semibold">
                    {ad.conversions > 0 ? MYR_COMPACT(ad.cpa) : DASH}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function adScore(ad: AggregateRow): number {
  // Composite 0-100: ROAS contributes most, then CTR vs cohort, then conv.
  const roasScore = Math.min(50, ad.roas * 12);
  const ctrScore = Math.min(30, ad.ctr * 6);
  const convScore = Math.min(20, ad.conversions * 4);
  return Math.round(roasScore + ctrScore + convScore);
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="drop-shadow-[0_0_4px_rgba(0,0,0,0.6)]">
      <circle cx="18" cy="18" r={r} fill="rgba(0,0,0,0.5)" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2.5"
      />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 18 18)"
      />
      <text
        x="18"
        y="22"
        fontSize="11"
        fontWeight="600"
        textAnchor="middle"
        fill="#fafafa"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {score}
      </text>
    </svg>
  );
}
