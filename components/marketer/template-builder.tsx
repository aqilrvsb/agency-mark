"use client";

/**
 * Template Builder modal — mirrors Meta Ads Manager's "Customize Columns"
 * UX, adapted for dark theme + multi-platform.
 *
 * Layout:
 *   ┌─ ALL COLUMN ──────────────── [N selected] [×] ─┐
 *   │ Tabs: [Key metrics] Tracking Ad settings Adv. Custom
 *   │ ┌─ left pane ─────────┬─ right pane ──────────┐│
 *   │ │ Search…             │ N columns selected    ││
 *   │ │ Category            │ ┌────────────────────┐││
 *   │ │  ▽ Group (n sel.)   │ │ ⋮⋮ Field      [×]│││
 *   │ │    ☑ Field          │ └────────────────────┘││
 *   │ │    ☐ Field          │ (drag to reorder)     ││
 *   │ │  ▽ Group            │                       ││
 *   │ │    ...              │                       ││
 *   │ └─────────────────────┴───────────────────────┘│
 *   │ [Delete preset]              [Cancel]  [Save]  │
 *   └────────────────────────────────────────────────┘
 *
 * Custom tab swaps the catalog for a formula editor (token-chip input
 * with autocomplete + live validation against the `expr-eval`-free
 * Pratt parser in lib/formula/engine.ts).
 *
 * Props are server-resolved + serialised to plain JSON. The component
 * itself is `'use client'` because it has interactive checkboxes,
 * search, drag-reorder, and formula validation.
 */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Search, GripVertical, ChevronDown, ChevronRight, Plus, AlertCircle, Trash2 } from "lucide-react";
import type { CatalogField, Level, Platform, PlatformCatalog, Tab } from "@/lib/templates/catalog-types";
import { parse, collectRefs, FNS } from "@/lib/formula/engine";

interface FieldToken {
  id: string;
  source: "field" | "formula";
}

interface FormulaSpec {
  id: string;
  name: string;
  expression: string;
  format: "number" | "currency" | "percent" | "ratio";
}

interface TemplateBuilderProps {
  catalog: PlatformCatalog;
  level: Level;
  initial: {
    id?: string;
    name: string;
    fields: FieldToken[];
    formulas: FormulaSpec[];
  };
  /** When true, this is editing an existing template; allows delete. */
  isEdit: boolean;
}

function fieldsByTab(catalog: PlatformCatalog, level: Level) {
  const result = new Map<Tab, { category: string; groups: { name: string; fields: CatalogField[] }[] }[]>();
  for (const tabSpec of catalog.tabs) {
    const tabCats = catalog.categories.filter((c) => c.tab === tabSpec.id);
    const out: { category: string; groups: { name: string; fields: CatalogField[] }[] }[] = [];
    for (const c of tabCats) {
      const groupsOut: { name: string; fields: CatalogField[] }[] = [];
      for (const groupName of c.groups) {
        const fields = catalog.fields.filter(
          (f) =>
            f.tab === tabSpec.id &&
            f.category === c.name &&
            f.group === groupName &&
            (f.validLevels === undefined || f.validLevels.includes(level))
        );
        if (fields.length > 0) groupsOut.push({ name: groupName, fields });
      }
      if (groupsOut.length > 0) out.push({ category: c.name, groups: groupsOut });
    }
    result.set(tabSpec.id, out);
  }
  return result;
}

export function TemplateBuilder({ catalog, level, initial, isEdit }: TemplateBuilderProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initial.name);
  const [tab, setTab] = useState<Tab>("key_metrics");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FieldToken[]>(initial.fields);
  const [formulas, setFormulas] = useState<FormulaSpec[]>(initial.formulas);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const tabbed = useMemo(() => fieldsByTab(catalog, level), [catalog, level]);
  const fieldById = useMemo(() => new Map(catalog.fields.map((f) => [f.id, f])), [catalog]);
  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  function toggleField(id: string) {
    setSelected((prev) => {
      const has = prev.some((p) => p.id === id);
      if (has) return prev.filter((p) => p.id !== id);
      return [...prev, { id, source: "field" }];
    });
  }

  function removeAt(idx: number) {
    setSelected((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setSelected((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }
  function moveDown(idx: number) {
    setSelected((prev) => {
      if (idx === prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabbed.get(tab) ?? [];
    return (
      tabbed.get(tab)?.map((c) => ({
        ...c,
        groups: c.groups
          .map((g) => ({
            ...g,
            fields: g.fields.filter((f) => f.label.toLowerCase().includes(q) || f.id.includes(q)),
          }))
          .filter((g) => g.fields.length > 0),
      })).filter((c) => c.groups.length > 0) ?? []
    );
  }, [search, tab, tabbed]);

  async function save() {
    setError(null);
    if (!name.trim()) {
      setError("Template needs a name");
      return;
    }
    if (selected.length === 0) {
      setError("Select at least one column");
      return;
    }

    startTransition(async () => {
      const res = await fetch(initial.id ? `/api/templates/${initial.id}` : "/api/templates", {
        method: initial.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: catalog.platform,
          level,
          name: name.trim(),
          fields: selected,
          formulas,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Save failed");
        return;
      }
      router.push(`/marketer/templates`);
      router.refresh();
    });
  }

  async function deleteTemplate() {
    if (!initial.id) return;
    if (!confirm("Delete this template?")) return;
    startTransition(async () => {
      await fetch(`/api/templates/${initial.id}`, { method: "DELETE" });
      router.push("/marketer/templates");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            All columns
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name…"
            className="flex-1 bg-transparent text-base font-semibold text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          />
        </div>
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-md hover:bg-white/5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </header>

      {/* Tabs */}
      <nav className="flex items-center gap-1 px-5 pt-3 border-b border-[var(--color-border)]">
        {catalog.tabs.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-[13px] rounded-t-md border-b-2 transition-colors ${
                isActive
                  ? "border-[var(--color-orange)] text-[var(--color-orange)] font-semibold"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Body — 2 panes */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] flex-1 min-h-0 overflow-hidden">
        {/* Left pane: catalog or formula editor */}
        <div className="border-r border-[var(--color-border)] flex flex-col min-h-0">
          {tab === "custom" ? (
            <CustomTabPane
              platformFields={Array.from(fieldById.keys())}
              formulas={formulas}
              setFormulas={setFormulas}
              onSelect={(id) =>
                setSelected((prev) =>
                  prev.some((p) => p.id === id) ? prev : [...prev, { id, source: "formula" }]
                )
              }
              selectedIds={selectedIds}
            />
          ) : (
            <>
              <div className="px-4 sm:px-5 py-3 border-b border-[var(--color-border)] flex items-center gap-2 sticky top-0 bg-[var(--color-bg-card)]">
                <Search size={14} className="text-[var(--color-text-muted)]" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for metrics or column settings"
                  className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                />
                <button
                  onClick={() => setCollapsed(new Set(filtered.flatMap((c) => c.groups.map((g) => `${c.category}::${g.name}`))))}
                  className="text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-2 py-1 rounded-md hover:bg-white/5"
                >
                  Collapse all
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3">
                {filtered.map((c) => (
                  <div key={c.category} className="mb-5">
                    <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-2.5">
                      {c.category}
                    </h3>
                    {c.groups.map((g) => {
                      const key = `${c.category}::${g.name}`;
                      const isCollapsed = collapsed.has(key);
                      const groupSelectedCount = g.fields.filter((f) => selectedIds.has(f.id)).length;
                      return (
                        <div
                          key={g.name}
                          className="rounded-lg border border-[var(--color-border)] bg-white/[0.02] mb-2 overflow-hidden"
                        >
                          <button
                            onClick={() =>
                              setCollapsed((prev) => {
                                const next = new Set(prev);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                              })
                            }
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02]"
                          >
                            <span className="flex items-center gap-2">
                              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                              <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                                {g.name}
                              </span>
                              {groupSelectedCount > 0 && (
                                <span className="text-[11px] text-[var(--color-text-muted)]">
                                  {groupSelectedCount} selected
                                </span>
                              )}
                            </span>
                          </button>
                          {!isCollapsed && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 px-4 pb-3 pt-1">
                              {g.fields.map((f) => (
                                <FieldRow
                                  key={f.id}
                                  field={f}
                                  checked={selectedIds.has(f.id)}
                                  onToggle={() => toggleField(f.id)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="text-sm text-[var(--color-text-muted)] py-8 text-center">
                    No fields match &quot;{search}&quot;.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right pane: selected columns */}
        <div className="flex flex-col min-h-0 bg-[var(--color-bg-soft)]/40">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <div className="text-[15px] font-semibold text-[var(--color-text-primary)]">
              {selected.length} columns selected
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              Click ↑↓ to arrange columns as they&apos;ll appear in the table.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {selected.map((s, i) => {
              const isFormula = s.source === "formula";
              const f = isFormula
                ? formulas.find((fm) => fm.id === s.id)
                : fieldById.get(s.id);
              if (!f) return null;
              const label = isFormula ? (f as FormulaSpec).name : (f as CatalogField).label;
              return (
                <div
                  key={s.id}
                  className="group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-white/[0.04] mb-1"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-30 leading-none text-[10px]"
                      aria-label="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveDown(i)}
                      disabled={i === selected.length - 1}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-30 leading-none text-[10px]"
                      aria-label="Move down"
                    >
                      ▼
                    </button>
                  </div>
                  <GripVertical size={14} className="text-[var(--color-text-muted)]/50" />
                  <span className="flex-1 text-[13px] text-[var(--color-text-primary)] truncate">
                    {label}
                    {isFormula && (
                      <span className="ml-1.5 text-[9px] uppercase tracking-wider text-[var(--color-orange)]">
                        formula
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => removeAt(i)}
                    className="text-[var(--color-text-muted)] hover:text-rose-400 opacity-0 group-hover:opacity-100"
                    aria-label="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
            {selected.length === 0 && (
              <div className="text-xs text-[var(--color-text-muted)] py-6 text-center">
                Pick fields from the left to start building your report.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          {isEdit && (
            <button
              onClick={deleteTemplate}
              disabled={pending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30"
            >
              <Trash2 size={14} /> Delete preset
            </button>
          )}
          {error && (
            <span className="flex items-center gap-1.5 text-[12px] text-rose-300">
              <AlertCircle size={13} /> {error}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="px-4 py-1.5 rounded-md text-[13px] text-[var(--color-text-secondary)] hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={pending}
            className="px-4 py-1.5 rounded-md text-[13px] font-semibold bg-[var(--color-orange)] text-black hover:bg-[var(--color-orange-hover)] disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </footer>
    </div>
  );
}

function FieldRow({
  field,
  checked,
  onToggle,
}: {
  field: CatalogField;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 rounded accent-[var(--color-orange)] cursor-pointer"
      />
      <span className="flex-1 text-[13px] text-[var(--color-text-primary)] truncate" title={field.description}>
        {field.label}
      </span>
      <FormatChip format={field.format} />
    </label>
  );
}

function FormatChip({ format }: { format: CatalogField["format"] }) {
  const sym =
    format === "currency"
      ? "RM"
      : format === "percent"
      ? "%"
      : format === "ratio"
      ? "×"
      : format === "duration"
      ? "s"
      : format === "thumbnail"
      ? "🖼"
      : format === "text"
      ? "T"
      : "#";
  return (
    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-text-muted)] tabular-nums">
      {sym}
    </span>
  );
}

// ─── Custom (formula) tab ──────────────────────────────────────────

function CustomTabPane({
  platformFields,
  formulas,
  setFormulas,
  onSelect,
  selectedIds,
}: {
  platformFields: string[];
  formulas: FormulaSpec[];
  setFormulas: React.Dispatch<React.SetStateAction<FormulaSpec[]>>;
  onSelect: (id: string) => void;
  selectedIds: Set<string>;
}) {
  const [draft, setDraft] = useState<FormulaSpec>({
    id: "",
    name: "",
    expression: "",
    format: "ratio",
  });
  const [draftError, setDraftError] = useState<string | null>(null);

  const allowedRefs = useMemo(() => {
    const s = new Set<string>(platformFields);
    for (const f of formulas) s.add(f.id);
    return s;
  }, [platformFields, formulas]);

  function validate(expr: string): string | null {
    if (!expr.trim()) return "Expression empty";
    try {
      const ast = parse(expr, allowedRefs);
      collectRefs(ast);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }

  function addFormula() {
    setDraftError(null);
    const id = draft.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    if (!id) {
      setDraftError("Name required");
      return;
    }
    if (formulas.some((f) => f.id === id) || platformFields.includes(id)) {
      setDraftError("Name already used");
      return;
    }
    const err = validate(draft.expression);
    if (err) {
      setDraftError(err);
      return;
    }
    setFormulas((prev) => [...prev, { ...draft, id, name: draft.name.trim() }]);
    setDraft({ id: "", name: "", expression: "", format: "ratio" });
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <div>
        <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-1">Custom formulas</h3>
        <p className="text-[12px] text-[var(--color-text-secondary)]">
          Compose new metrics from existing fields. Use{" "}
          <code className="font-mono text-[var(--color-orange)]">+ - * /</code>, parens, and helpers like{" "}
          <code className="font-mono text-[var(--color-orange)]">safeDiv(a, b)</code>,{" "}
          <code className="font-mono text-[var(--color-orange)]">coalesce(a, b)</code>.
        </p>
      </div>

      {/* Draft form */}
      <div className="rounded-lg border border-[var(--color-border)] bg-white/[0.02] p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. Hook rate"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-orange)]"
          />
          <select
            value={draft.format}
            onChange={(e) => setDraft({ ...draft, format: e.target.value as FormulaSpec["format"] })}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] focus:outline-none"
          >
            <option value="number">Number</option>
            <option value="currency">Currency</option>
            <option value="percent">Percent</option>
            <option value="ratio">Ratio (×)</option>
          </select>
        </div>
        <textarea
          value={draft.expression}
          onChange={(e) => setDraft({ ...draft, expression: e.target.value })}
          placeholder="safeDiv(video_views_2s, impressions)"
          rows={2}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-[13px] font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-orange)]"
        />
        {draftError && (
          <div className="flex items-center gap-1.5 text-[12px] text-rose-300">
            <AlertCircle size={13} /> {draftError}
          </div>
        )}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Available fields: {platformFields.length}.{" "}
            Functions: <code className="font-mono">{Object.keys(FNS).join(", ")}</code>
          </p>
          <button
            onClick={addFormula}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold bg-[var(--color-orange)] text-black hover:bg-[var(--color-orange-hover)]"
          >
            <Plus size={13} /> Add formula
          </button>
        </div>
      </div>

      {/* Existing formulas */}
      <div className="space-y-2">
        {formulas.length > 0 && (
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Saved formulas
          </h4>
        )}
        {formulas.map((f) => (
          <div
            key={f.id}
            className="rounded-lg border border-[var(--color-border)] bg-white/[0.02] p-3 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">
                {f.name}
              </div>
              <code className="block text-[11px] font-mono text-[var(--color-text-muted)] truncate">
                {f.expression}
              </code>
            </div>
            <button
              onClick={() => onSelect(f.id)}
              disabled={selectedIds.has(f.id)}
              className="px-2 py-1 rounded-md text-[11px] text-[var(--color-orange)] hover:bg-[var(--color-orange-tint)] disabled:opacity-40 disabled:cursor-default"
            >
              {selectedIds.has(f.id) ? "Selected" : "Add to columns"}
            </button>
            <button
              onClick={() => setFormulas((prev) => prev.filter((x) => x.id !== f.id))}
              className="p-1 text-[var(--color-text-muted)] hover:text-rose-400"
              aria-label="Delete"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
