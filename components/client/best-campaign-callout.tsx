import type { AggregateRow } from "@/lib/client-data/aggregate";
import { Trophy } from "lucide-react";

export function BestCampaignCallout({ campaign }: { campaign: AggregateRow | null }) {
  if (!campaign) return null;
  return (
    <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 p-4 mb-6 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
        <Trophy className="w-5 h-5 text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold mb-0.5">
          Best campaign this period
        </div>
        <div className="font-bold truncate" title={campaign.name}>
          {campaign.name}
        </div>
      </div>
      <div className="flex items-center gap-4 text-right flex-shrink-0">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold">
            Spend
          </div>
          <div className="font-mono font-bold text-sm">
            RM {campaign.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold">
            ROAS
          </div>
          <div className="font-mono font-bold text-sm text-emerald-400">{campaign.roas.toFixed(2)}×</div>
        </div>
      </div>
    </div>
  );
}
