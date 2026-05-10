"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, Loader2 } from "lucide-react";

interface Brand {
  id: string;
  name: string;
  email: string | null;
  is_active: boolean;
}

export function ClientSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchBrands = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const url = `/api/agency/clients-search${query ? `?q=${encodeURIComponent(query)}` : ""}`;
      const r = await fetch(url);
      const body = await r.json();
      setBrands(body.brands ?? []);
      setActiveIdx(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Open: load initial list. Subsequent typing debounced.
  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => fetchBrands(q), q.length > 0 ? 150 : 0);
    return () => clearTimeout(handle);
  }, [open, q, fetchBrands]);

  // Cmd/Ctrl-K shortcut to open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click-outside close
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function pick(b: Brand) {
    router.push(`/clients/${b.id}`);
    setOpen(false);
    setQ("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(brands.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const b = brands[activeIdx];
      if (b) pick(b);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:border-white/10 transition w-full md:w-72"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Search clients…</span>
          <kbd className="hidden md:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
            ⌘K
          </kbd>
        </button>
      ) : (
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search clients by name…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-orange)]/40 text-sm focus:outline-none"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[var(--color-text-muted)]" />
          )}

          <div className="absolute top-full mt-2 w-full rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] shadow-2xl overflow-hidden z-50">
            {brands.length === 0 && !loading && (
              <div className="px-4 py-6 text-center text-xs text-[var(--color-text-muted)]">
                {q ? "No clients match that name." : "No clients yet."}
              </div>
            )}
            {brands.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => pick(b)}
                onMouseEnter={() => setActiveIdx(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition border-b border-[var(--color-border)] last:border-0 ${
                  i === activeIdx ? "bg-white/5" : ""
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400/30 to-orange-600/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-[var(--color-orange)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{b.name}</div>
                  {b.email && (
                    <div className="text-[10px] text-[var(--color-text-muted)] truncate">{b.email}</div>
                  )}
                </div>
                {!b.is_active && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-text-muted)]">
                    Inactive
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
