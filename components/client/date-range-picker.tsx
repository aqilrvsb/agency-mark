"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  // Default 90 days — matches Zernio's discovery backfill window AND
  // the server-side parseDateRange() default in lib/client-data/aggregate.ts.
  // Out-of-sync defaults caused the picker to show "10-Apr → 10-May"
  // (30 days) while the page heading + data correctly used 91 days.
  const [start, setStart] = useState(search.get("start") ?? isoDaysAgo(90));
  const [end, setEnd] = useState(search.get("end") ?? todayIso());

  function apply(s: string, e: string) {
    const params = new URLSearchParams(search.toString());
    params.set("start", s);
    params.set("end", e);
    router.push(`${pathname}?${params.toString()}`);
  }

  function preset(days: number) {
    const s = isoDaysAgo(days);
    const e = todayIso();
    setStart(s);
    setEnd(e);
    apply(s, e);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] w-full sm:w-auto">
        <Calendar className="w-4 h-4 text-[var(--color-text-muted)]" />
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="bg-transparent text-sm focus:outline-none"
        />
        <span className="text-[var(--color-text-muted)]">→</span>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="bg-transparent text-sm focus:outline-none"
        />
        <Button size="sm" onClick={() => apply(start, end)}>Apply</Button>
      </div>
      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            onClick={() => preset(p.days)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--color-bg-soft)] border border-[var(--color-border)] hover:border-[var(--color-orange)] transition"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
