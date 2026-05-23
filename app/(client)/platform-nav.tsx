"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SubItem {
  href: string;
  label: string;
}

export function PlatformNavSection({
  platform,
  label,
  color,
  items,
}: {
  platform: string;
  label: string;
  color: string;
  items: SubItem[];
}) {
  const pathname = usePathname();
  const isWithin = pathname.startsWith(`/client/${platform}`);
  const [open, setOpen] = useState(isWithin);

  useEffect(() => {
    if (isWithin) setOpen(true);
  }, [isWithin]);

  // No sub-items → render as a static label row (no chevron, not clickable).
  if (items.length === 0) {
    return (
      <li>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--color-text-secondary)]">
          <span className={`w-2 h-2 rounded-full ${color}`} />
          {label}
        </div>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)] transition"
      >
        <span className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${color}`} />
          {label}
        </span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && (
        <ul className="ml-5 mt-1 space-y-0.5 border-l border-[var(--color-border)] pl-2">
          {items.map((it) => {
            const active = pathname === it.href;
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={`block px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    active
                      ? "bg-[var(--color-orange)]/15 text-[var(--color-orange)]"
                      : "text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
