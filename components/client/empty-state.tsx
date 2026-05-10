import Link from "next/link";
import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
  actionExternal,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  actionExternal?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] text-center ${
        compact ? "p-6" : "p-10"
      }`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
          {icon}
        </div>
      )}
      <div className={`font-bold mb-1 ${compact ? "text-sm" : "text-base"}`}>{title}</div>
      {description && (
        <div className="text-xs text-[var(--color-text-muted)] mb-4 max-w-md mx-auto leading-relaxed">
          {description}
        </div>
      )}
      {actionHref && actionLabel && (
        actionExternal ? (
          <a
            href={actionHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--color-orange)] text-[#0a0a0a] hover:bg-[var(--color-orange-hover)] transition"
          >
            {actionLabel} →
          </a>
        ) : (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--color-orange)] text-[#0a0a0a] hover:bg-[var(--color-orange-hover)] transition"
          >
            {actionLabel} →
          </Link>
        )
      )}
    </div>
  );
}
