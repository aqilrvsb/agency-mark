import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface Tile {
  label: string;
  value: string;
  delta: number;
  positiveIsGood?: boolean;
  accent?: string;
}

export function AgencyHeroStrip({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {tiles.map((t) => (
        <KPITile key={t.label} {...t} />
      ))}
    </div>
  );
}

function KPITile({ label, value, delta, positiveIsGood = true, accent }: Tile) {
  const isNeutral = Math.abs(delta) < 0.5;
  const isGood = positiveIsGood ? delta > 0 : delta < 0;
  const Arrow = isNeutral ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const color = isNeutral
    ? "text-[var(--color-text-muted)]"
    : isGood
      ? "text-emerald-400"
      : "text-red-400";
  return (
    <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-5">
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold mb-1.5">
        {label}
      </div>
      <div className={`font-display font-extrabold text-3xl mb-1 ${accent ?? "text-[var(--color-text-primary)]"}`}>
        {value}
      </div>
      <div className={`flex items-center gap-1 text-xs font-bold ${color}`}>
        <Arrow className="w-3.5 h-3.5" />
        <span>{isNeutral ? "no change" : `${Math.abs(delta).toFixed(1)}%`}</span>
        <span className="text-[var(--color-text-muted)] font-normal">vs prev 7d</span>
      </div>
    </div>
  );
}
