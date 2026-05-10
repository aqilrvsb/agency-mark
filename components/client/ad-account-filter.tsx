"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Building2, Check, ChevronDown } from "lucide-react";

export interface AdAccountOption {
  platform: string;
  platformAdAccountId: string;
  adAccountName: string | null;
  currency: string | null;
}

/**
 * "Ad accounts: All (N) ▾" chip with a multi-select popover.
 *
 * Renders only when the brand has 2+ Ad Accounts on a single platform —
 * one Ad Account = nothing to filter.
 *
 * URL contract: writes ?ad_accounts=act_X,act_Y on change. Server-side
 * code reads `searchParams.ad_accounts` and filters ad_data by
 * platform_ad_account_id when present; absent = blended view.
 *
 * Cross-currency rule: if the user's selection mixes currencies, a small
 * warning shows. We don't auto-block — the user can still pick, but the
 * KPIs become apples-and-oranges. (Not an issue for Test Brand X — both
 * Meta accounts are MYR.)
 */
export function AdAccountFilter({ accounts }: { accounts: AdAccountOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close on click-outside
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Don't render if there's nothing to filter
  if (accounts.length < 2) return null;

  const selectedRaw = (search.get("ad_accounts") ?? "").trim();
  const selectedSet = new Set(selectedRaw ? selectedRaw.split(",").filter(Boolean) : []);
  const allSelected = selectedSet.size === 0; // empty = all
  const visibleSet = allSelected
    ? new Set(accounts.map((a) => a.platformAdAccountId))
    : selectedSet;

  function update(next: Set<string>) {
    const params = new URLSearchParams(search.toString());
    // Empty or all-selected → drop the param (blended default)
    if (next.size === 0 || next.size === accounts.length) {
      params.delete("ad_accounts");
    } else {
      params.set("ad_accounts", [...next].join(","));
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggle(id: string) {
    const next = new Set(visibleSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    update(next);
  }

  function selectAll() {
    update(new Set());
  }

  // Cross-currency check (warning, not block)
  const selectedAccounts = accounts.filter((a) => visibleSet.has(a.platformAdAccountId));
  const currencies = [...new Set(selectedAccounts.map((a) => a.currency ?? "—"))];
  const mixedCurrency = currencies.length > 1;

  const label = allSelected
    ? `All (${accounts.length})`
    : visibleSet.size === 1
      ? selectedAccounts[0]?.adAccountName ?? "1 selected"
      : `${visibleSet.size} of ${accounts.length}`;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] hover:border-white/10 transition text-sm font-bold whitespace-nowrap"
      >
        <Building2 className="w-4 h-4 text-[var(--color-text-muted)]" />
        <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold">
          Ad accounts
        </span>
        <span>{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl z-30 overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold">
              {accounts.length} ad account{accounts.length === 1 ? "" : "s"}
            </div>
            <button
              onClick={selectAll}
              className="text-xs font-bold text-[var(--color-orange)] hover:underline"
            >
              Select all
            </button>
          </div>

          <ul className="max-h-72 overflow-y-auto">
            {accounts.map((a) => {
              const isOn = visibleSet.has(a.platformAdAccountId);
              return (
                <li key={a.platformAdAccountId}>
                  <button
                    onClick={() => toggle(a.platformAdAccountId)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition text-left"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        isOn
                          ? "bg-[var(--color-orange)] border-[var(--color-orange)]"
                          : "border-[var(--color-border)]"
                      }`}
                    >
                      {isOn && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate">
                        {a.adAccountName ?? a.platformAdAccountId}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)] font-mono truncate">
                        {a.platformAdAccountId}
                        {a.currency ? ` · ${a.currency}` : ""}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {mixedCurrency && (
            <div className="px-3 py-2 border-t border-[var(--color-border)] bg-amber-500/5 text-[10px] text-amber-300/90">
              ⚠ Mixed currencies ({currencies.join(", ")}) — KPI totals may not aggregate cleanly.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
