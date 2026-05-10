export function GoalPacingBar({
  spent,
  budget,
  daysElapsed,
  daysTotal,
}: {
  spent: number;
  budget: number;
  daysElapsed: number;
  daysTotal: number;
}) {
  if (budget <= 0) return null;
  const spendPct = Math.min(100, (spent / budget) * 100);
  const timePct = Math.min(100, (daysElapsed / daysTotal) * 100);
  const delta = spendPct - timePct;
  // pacing label
  let label: string;
  let labelColor: string;
  if (delta < -10) {
    label = "Below pace";
    labelColor = "text-amber-400";
  } else if (delta > 10) {
    label = "Ahead of pace";
    labelColor = "text-amber-400";
  } else {
    label = "On track";
    labelColor = "text-emerald-400";
  }
  return (
    <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-3 mb-6 flex items-center gap-4">
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold whitespace-nowrap">
        Budget pacing
      </div>
      <div className="flex-1 relative h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--color-orange)] to-amber-500 transition-all"
          style={{ width: `${spendPct}%` }}
        />
        <div
          className="absolute inset-y-0 w-0.5 bg-white/40"
          style={{ left: `${timePct}%` }}
          title="Today"
        />
      </div>
      <div className="text-xs font-mono text-[var(--color-text-secondary)] whitespace-nowrap">
        RM {spent.toLocaleString(undefined, { maximumFractionDigits: 0 })} / RM{" "}
        {budget.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
      <div className={`text-xs font-bold whitespace-nowrap ${labelColor}`}>{label}</div>
    </div>
  );
}
