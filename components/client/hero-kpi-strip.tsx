import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface Tile {
  label: string;
  value: string;
  delta: number; // percent
  deltaPositiveIsGood?: boolean; // CPA: lower is better
  accent?: string;
}

export function HeroKPIStrip({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-6">
      {tiles.map((t) => (
        <KPITile key={t.label} {...t} />
      ))}
    </div>
  );
}

function KPITile({ label, value, delta, deltaPositiveIsGood = true, accent }: Tile) {
  const isGood = deltaPositiveIsGood ? delta > 0 : delta < 0;
  const isNeutral = Math.abs(delta) < 0.5;
  const Arrow = isNeutral ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const color = isNeutral
    ? "text-[var(--color-text-muted)]"
    : isGood
      ? "text-emerald-400"
      : "text-red-400";

  return (
    <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-4">
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold mb-1.5">
        {label}
      </div>
      <div className={`font-display font-extrabold text-2xl mb-1 ${accent ?? "text-[var(--color-text-primary)]"}`}>
        {value}
      </div>
      <div className={`flex items-center gap-1 text-xs font-bold ${color}`}>
        <Arrow className="w-3.5 h-3.5" />
        <span>{isNeutral ? "no change" : `${Math.abs(delta).toFixed(1)}%`}</span>
        <span className="text-[var(--color-text-muted)] font-normal">vs prev</span>
      </div>
    </div>
  );
}
