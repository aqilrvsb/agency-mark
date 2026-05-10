import type { PlatformBreakdown } from "@/lib/client-data/overview-data";
import { Plug } from "lucide-react";

const PLATFORM_META: Record<PlatformBreakdown["platform"], { label: string; dot: string; bg: string }> = {
  meta_ads: { label: "Facebook Ads", dot: "bg-blue-400", bg: "from-blue-500/10 to-transparent" },
  google_ads: { label: "Google Ads", dot: "bg-amber-400", bg: "from-amber-500/10 to-transparent" },
  tiktok_ads: { label: "TikTok Ads", dot: "bg-pink-400", bg: "from-pink-500/10 to-transparent" },
};

const fmtMyr = (n: number) =>
  `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function ChannelBreakdown({ platforms }: { platforms: PlatformBreakdown[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      {platforms.map((p) => {
        const meta = PLATFORM_META[p.platform];
        return (
          <div
            key={p.platform}
            className={`rounded-2xl bg-gradient-to-br ${meta.bg} bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-4 ${
              !p.connected ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
              <div className="font-bold text-sm">{meta.label}</div>
              {p.connected ? (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-bold uppercase">
                  Connected
                </span>
              ) : (
                <span className="ml-auto text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                  <Plug className="w-3 h-3" /> Not connected
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">
                  Spend
                </div>
                <div className="font-bold font-mono">{fmtMyr(p.spend)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">
                  Conv.
                </div>
                <div className="font-bold font-mono">{p.conversions.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">
                  ROAS
                </div>
                <div className="font-bold font-mono">{p.roas > 0 ? `${p.roas.toFixed(2)}×` : "—"}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
