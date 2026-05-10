"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Target, Trash2 } from "lucide-react";

interface KpiTarget {
  id: string;
  metric: string;
  target_value: number;
  direction: string;
}

const METRIC_LABELS: Record<string, { label: string; unit: string; defaultDirection: "higher_is_better" | "lower_is_better" }> = {
  spend: { label: "Monthly spend", unit: "RM", defaultDirection: "lower_is_better" },
  revenue: { label: "Monthly revenue", unit: "RM", defaultDirection: "higher_is_better" },
  conversions: { label: "Monthly conversions", unit: "leads", defaultDirection: "higher_is_better" },
  roas: { label: "ROAS target", unit: "×", defaultDirection: "higher_is_better" },
  cpa: { label: "Max CPA", unit: "RM", defaultDirection: "lower_is_better" },
  ctr: { label: "CTR target", unit: "%", defaultDirection: "higher_is_better" },
};

export function GoalsSection({ brandId, initialTargets }: { brandId: string; initialTargets: KpiTarget[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const usedMetrics = new Set(initialTargets.map((t) => t.metric));
  const availableMetrics = Object.keys(METRIC_LABELS).filter((m) => !usedMetrics.has(m));
  const [metric, setMetric] = useState(availableMetrics[0] ?? "spend");
  const [value, setValue] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(value);
    if (!Number.isFinite(num) || num <= 0) return;
    const meta = METRIC_LABELS[metric];
    const res = await fetch("/api/agency/kpi-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand_id: brandId,
        metric,
        target_value: num,
        direction: meta.defaultDirection,
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e.error || "Failed to save goal");
      return;
    }
    setValue("");
    setShowForm(false);
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    if (!confirm("Remove this goal?")) return;
    const res = await fetch(`/api/agency/kpi-targets?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Failed to remove");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div>
      {initialTargets.length === 0 && !showForm ? (
        <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-8 text-center">
          <Target className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-3" />
          <div className="text-sm font-bold mb-1">No goals set yet</div>
          <div className="text-xs text-[var(--color-text-muted)] mb-4">
            Set monthly targets so the client can see progress on their dashboard.
          </div>
          {availableMetrics.length > 0 && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[var(--color-orange)] text-[#0a0a0a] hover:bg-[var(--color-orange-hover)] transition"
            >
              <Plus className="w-4 h-4" /> Add first goal
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            {initialTargets.map((t) => {
              const meta = METRIC_LABELS[t.metric];
              return (
                <div
                  key={t.id}
                  className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold mb-0.5">
                      {meta?.label ?? t.metric}
                    </div>
                    <div className="font-display font-extrabold text-2xl">
                      {meta?.unit === "RM" ? "RM " : ""}
                      {t.target_value.toLocaleString()}
                      {meta?.unit && meta.unit !== "RM" ? ` ${meta.unit}` : ""}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mt-1">
                      {t.direction === "higher_is_better" ? "Higher is better" : "Lower is better"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(t.id)}
                    disabled={isPending}
                    className="text-[var(--color-text-muted)] hover:text-red-400 transition"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
          {availableMetrics.length > 0 && !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="text-xs font-bold text-[var(--color-orange)] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add goal
            </button>
          )}
        </>
      )}

      {showForm && availableMetrics.length > 0 && (
        <form onSubmit={submit} className="mt-3 p-4 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
            >
              {availableMetrics.map((m) => (
                <option key={m} value={m}>
                  {METRIC_LABELS[m].label}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Target ${METRIC_LABELS[metric]?.unit ?? ""}`}
              required
              className="px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending || !value.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--color-orange)] text-[#0a0a0a] text-sm font-bold disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg bg-white/5 text-[var(--color-text-secondary)] text-sm font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
