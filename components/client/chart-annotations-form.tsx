"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin, Plus, Trash2 } from "lucide-react";

export interface AnnotationItem {
  id: string;
  anchor_date: string;
  body: string;
  created_at: string;
  author_name?: string | null;
}

export function ChartAnnotationsManager({
  brandId,
  rangeStart,
  rangeEnd,
  annotations,
  canEdit,
}: {
  brandId: string;
  rangeStart: string;
  rangeEnd: string;
  annotations: AnnotationItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(rangeEnd);
  const [body, setBody] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const res = await fetch("/api/agency/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand_id: brandId, anchor_date: date, body: body.trim() }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e.error || "Failed to save annotation");
      return;
    }
    setBody("");
    setShowForm(false);
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    if (!confirm("Remove this annotation?")) return;
    const res = await fetch(`/api/agency/annotations?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Failed to remove");
      return;
    }
    startTransition(() => router.refresh());
  }

  if (!canEdit && annotations.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-[var(--color-orange)]" />
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold">
            Annotations
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">
            {annotations.length} pin{annotations.length === 1 ? "" : "s"}
          </span>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="text-xs font-bold text-[var(--color-orange)] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {showForm ? "Cancel" : "Add pin"}
          </button>
        )}
      </div>

      {canEdit && showForm && (
        <form onSubmit={submit} className="mb-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              min={rangeStart}
              max={rangeEnd}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-[var(--color-border)] text-sm w-full sm:w-44 [color-scheme:dark]"
              required
            />
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g. Paused Promo May because CPA spiked to RM 45"
              maxLength={280}
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-[var(--color-border)] text-sm"
              required
            />
            <button
              type="submit"
              disabled={isPending || !body.trim()}
              className="px-4 py-2 rounded-lg bg-[var(--color-orange)] text-[#0a0a0a] text-sm font-bold disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Pin"}
            </button>
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)]">
            Clients see this on the chart so they know what you did and why.
          </div>
        </form>
      )}

      {annotations.length === 0 ? (
        <div className="text-xs text-[var(--color-text-muted)]">
          {canEdit
            ? "No annotations yet. Pin one when you make a meaningful change so the client sees it in context."
            : "Your agency hasn't pinned any updates yet."}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {annotations.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-3 py-2 border-t border-[var(--color-border)] first:border-0 first:pt-0"
            >
              <div className="w-14 flex-shrink-0 text-[10px] font-mono text-[var(--color-text-muted)] mt-0.5">
                {a.anchor_date.slice(5)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[var(--color-text-secondary)]">{a.body}</div>
                {a.author_name && (
                  <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">— {a.author_name}</div>
                )}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  disabled={isPending}
                  className="text-[var(--color-text-muted)] hover:text-red-400 transition flex-shrink-0"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
