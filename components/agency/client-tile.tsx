import Link from "next/link";
import type { BrandTile } from "@/lib/agency-data/dashboard-data";
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Minus } from "lucide-react";

const STATUS = {
  healthy: { dot: "bg-emerald-400", glow: "shadow-emerald-500/10", label: "Healthy" },
  warn: { dot: "bg-amber-400", glow: "shadow-amber-500/20", label: "Watch" },
  alert: { dot: "bg-red-400", glow: "shadow-red-500/30", label: "Alert" },
  no_data: { dot: "bg-white/20", glow: "shadow-none", label: "No data" },
} as const;

const PLATFORM_BADGE = {
  facebook: { label: "FB", className: "bg-blue-500/15 text-blue-300" },
  google: { label: "GG", className: "bg-amber-500/15 text-amber-300" },
  tiktok: { label: "TT", className: "bg-pink-500/15 text-pink-300" },
} as const;

const fmtMyr = (n: number) =>
  `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function ClientTile({ tile }: { tile: BrandTile }) {
  const status = STATUS[tile.status];
  return (
    <Link
      href={`/clients/${tile.id}`}
      className={`group rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-4 transition hover:border-white/10 hover:bg-white/[0.03] ${status.glow} hover:shadow-lg block`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`w-2 h-2 rounded-full ${status.dot} flex-shrink-0`} />
          <div className="font-bold truncate" title={tile.name}>
            {tile.name}
          </div>
        </div>
        {tile.unreadAlerts > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-300 flex items-center gap-1 flex-shrink-0">
            <AlertTriangle className="w-3 h-3" />
            {tile.unreadAlerts}
          </span>
        )}
      </div>

      <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
        {status.label} · {tile.statusReason}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat label="Spend 7d" value={fmtMyr(tile.spend)} delta={tile.spendDelta} positiveIsGood={false} />
        <Stat
          label="ROAS"
          value={tile.roas > 0 ? `${tile.roas.toFixed(2)}×` : "—"}
          delta={tile.roasDelta}
          positiveIsGood={true}
        />
        <Stat
          label="Conv."
          value={tile.conversions.toLocaleString()}
          delta={tile.conversionsDelta}
          positiveIsGood={true}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {tile.platforms.length === 0 ? (
            <span className="text-[10px] text-[var(--color-text-muted)]">No platforms connected</span>
          ) : (
            tile.platforms.map((p) => {
              const meta = PLATFORM_BADGE[p as keyof typeof PLATFORM_BADGE];
              if (!meta) return null;
              return (
                <span key={p} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${meta.className}`}>
                  {meta.label}
                </span>
              );
            })
          )}
        </div>
        <span className="text-[10px] text-[var(--color-text-muted)] group-hover:text-[var(--color-orange)] transition">
          Open →
        </span>
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  delta,
  positiveIsGood,
}: {
  label: string;
  value: string;
  delta: number;
  positiveIsGood: boolean;
}) {
  const isNeutral = Math.abs(delta) < 0.5;
  const isGood = positiveIsGood ? delta > 0 : delta < 0;
  const Arrow = isNeutral ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const color = isNeutral
    ? "text-[var(--color-text-muted)]"
    : isGood
      ? "text-emerald-400"
      : "text-red-400";
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold mb-0.5">
        {label}
      </div>
      <div className="font-mono font-bold text-xs">{value}</div>
      <div className={`text-[10px] flex items-center gap-0.5 ${color}`}>
        <Arrow className="w-2.5 h-2.5" />
        {isNeutral ? "—" : `${Math.abs(delta).toFixed(0)}%`}
      </div>
    </div>
  );
}
