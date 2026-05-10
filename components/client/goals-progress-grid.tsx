import type { KpiGoal } from "@/lib/client-data/overview-data";

const METRIC_LABELS: Record<string, { label: string; format: (v: number) => string }> = {
  spend: { label: "Spend cap", format: (v) => `RM ${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
  revenue: { label: "Revenue goal", format: (v) => `RM ${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
  conversions: { label: "Conversions goal", format: (v) => v.toLocaleString() },
  roas: { label: "ROAS target", format: (v) => `${v.toFixed(2)}×` },
  cpa: { label: "Max CPA", format: (v) => `RM ${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
  ctr: { label: "CTR target", format: (v) => `${v.toFixed(2)}%` },
};

export function GoalsProgressGrid({ goals }: { goals: KpiGoal[] }) {
  if (goals.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
      {goals.map((g) => (
        <GoalCard key={g.id} goal={g} />
      ))}
    </div>
  );
}

function GoalCard({ goal }: { goal: KpiGoal }) {
  const meta = METRIC_LABELS[goal.metric] ?? { label: goal.metric, format: (v: number) => v.toString() };
  const pct = Math.max(0, Math.min(100, goal.pct_of_target));
  // Status:
  //   higher_is_better: pct ≥ 100 = good, 70-100 = on pace, < 70 = behind
  //   lower_is_better: pct ≥ 100 means current ≤ target = good
  let statusLabel: string;
  let statusColor: string;
  let barColor: string;
  if (goal.direction === "higher_is_better") {
    if (pct >= 100) {
      statusLabel = "Goal hit";
      statusColor = "text-emerald-300";
      barColor = "from-emerald-500 to-emerald-400";
    } else if (pct >= 70) {
      statusLabel = "On track";
      statusColor = "text-emerald-300";
      barColor = "from-emerald-500 to-emerald-400";
    } else if (pct >= 40) {
      statusLabel = "Behind pace";
      statusColor = "text-amber-300";
      barColor = "from-amber-500 to-amber-400";
    } else {
      statusLabel = "Far behind";
      statusColor = "text-red-300";
      barColor = "from-red-500 to-red-400";
    }
  } else {
    // lower is better
    if (pct >= 100) {
      statusLabel = "Within target";
      statusColor = "text-emerald-300";
      barColor = "from-emerald-500 to-emerald-400";
    } else if (pct >= 80) {
      statusLabel = "Slightly over";
      statusColor = "text-amber-300";
      barColor = "from-amber-500 to-amber-400";
    } else {
      statusLabel = "Over target";
      statusColor = "text-red-300";
      barColor = "from-red-500 to-red-400";
    }
  }

  return (
    <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold">
          {meta.label}
        </div>
        <div className={`text-[10px] font-bold ${statusColor}`}>{statusLabel}</div>
      </div>
      <div className="font-display font-extrabold text-2xl mb-1">
        {meta.format(goal.current_value)}
        <span className="text-[var(--color-text-muted)] font-normal text-sm ml-1.5">
          / {meta.format(goal.target_value)}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] text-[var(--color-text-muted)] font-mono text-right">
        {pct.toFixed(0)}% of target
      </div>
    </div>
  );
}
