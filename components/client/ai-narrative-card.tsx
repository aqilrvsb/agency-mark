import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";

export interface NarrativeContent {
  summary?: string;
  wins?: string[];
  issues?: string[];
  recommendations?: string[];
  authoredBy?: string;
  authoredAt?: string;
}

export function AINarrativeCard({ content }: { content: NarrativeContent | null }) {
  const hasContent =
    !!content && (content.summary || content.wins?.length || content.issues?.length || content.recommendations?.length);

  if (!hasContent) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[var(--color-orange)]/5 to-[var(--color-bg-soft)] border border-[var(--color-border)] p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--color-orange)]/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[var(--color-orange)]" />
          </div>
          <div>
            <div className="font-bold text-sm">Adi insights</div>
            <div className="text-xs text-[var(--color-text-muted)]">AI-generated weekly summary · Bahasa Melayu / English</div>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Insights akan muncul di sini bila ada data yang cukup. Adi akan analyze trend, highlight wins, dan suggest next steps —
          biasanya selepas 14 hari data ad live.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[var(--color-orange)]/5 to-[var(--color-bg-soft)] border border-[var(--color-border)] p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[var(--color-orange)]/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[var(--color-orange)]" />
          </div>
          <div>
            <div className="font-bold text-sm">Adi insights</div>
            <div className="text-xs text-[var(--color-text-muted)]">
              {content?.authoredBy ? `${content.authoredBy} · ` : "AI-generated · "}
              {content?.authoredAt ?? "Updated daily"}
            </div>
          </div>
        </div>
      </div>

      {content.summary && (
        <p className="text-sm text-[var(--color-text-secondary)] mb-4 leading-relaxed">{content.summary}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NarrativeColumn
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          label="Wins"
          items={content.wins ?? []}
          tint="text-emerald-300"
        />
        <NarrativeColumn
          icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
          label="Issues"
          items={content.issues ?? []}
          tint="text-amber-300"
        />
        <NarrativeColumn
          icon={<Lightbulb className="w-4 h-4 text-cyan-400" />}
          label="Recommendations"
          items={content.recommendations ?? []}
          tint="text-cyan-300"
        />
      </div>
    </div>
  );
}

function NarrativeColumn({
  icon,
  label,
  items,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  items: string[];
  tint: string;
}) {
  return (
    <div>
      <div className={`flex items-center gap-1.5 mb-2 text-xs uppercase tracking-widest font-bold ${tint}`}>
        {icon}
        {label}
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-[var(--color-text-muted)]">No material changes.</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="text-xs text-[var(--color-text-secondary)] leading-relaxed flex gap-1.5">
              <span className={tint}>•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
