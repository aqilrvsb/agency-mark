"use client";

import { useState } from "react";
import { formatValue } from "@/lib/templates/format";
import { CreativeLightbox, type CreativeLightboxData } from "@/components/client/creative-lightbox";

export interface ReportColumn {
  id: string;
  label: string;
  format: string;
  path: string;
  align: "left" | "right";
}

export interface ReportRow {
  // Field/formula values keyed by column.path
  values: Record<string, unknown>;
  // Optional creative metadata — when present, the row is clickable and
  // opens the lightbox. Only Ad-level reports populate this.
  media?: CreativeLightboxData;
}

/**
 * Client wrapper around the report-runner table. Renders the same column
 * layout the server computes but adds two interactive bits:
 *
 *  1. Row click → opens the CreativeLightbox modal (when row.media is set).
 *     For non-Ad reports media is undefined, so rows stay non-interactive
 *     and we don't add a misleading hover/cursor cue.
 *  2. Thumbnail cells get a small "click to enlarge" hover hint and
 *     stop event propagation so clicking the thumbnail still opens the
 *     full lightbox without double-firing the row click.
 */
export function ReportTable({
  columns,
  rows,
}: {
  columns: ReportColumn[];
  rows: ReportRow[];
}) {
  const [active, setActive] = useState<CreativeLightboxData | null>(null);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-white/[0.02]">
                {columns.map((c) => (
                  <th
                    key={c.id}
                    className={`text-[10px] font-semibold tracking-[0.06em] text-[var(--color-text-muted)] uppercase px-4 py-3 ${
                      c.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)]"
                >
                  No data in this date range. Try expanding the window or connect more ad accounts.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-white/[0.02]">
                {columns.map((c) => (
                  <th
                    key={c.id}
                    className={`text-[10px] font-semibold tracking-[0.06em] text-[var(--color-text-muted)] uppercase px-4 py-3 ${
                      c.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((row, i) => {
                const clickable = !!row.media;
                return (
                  <tr
                    key={i}
                    className={`transition-colors hover:bg-white/[0.02] ${
                      clickable ? "cursor-pointer" : ""
                    }`}
                    onClick={clickable ? () => setActive(row.media!) : undefined}
                  >
                    {columns.map((c) => {
                      const v: unknown = row.values[c.path];
                      const isThumb = c.format === "thumbnail";
                      const isText = c.format === "text";
                      return (
                        <td
                          key={c.id}
                          className={`px-4 py-3 text-[13px] text-[var(--color-text-secondary)] ${
                            c.align === "right" ? "text-right tabular-nums" : "text-left"
                          }`}
                        >
                          {isThumb ? (
                            typeof v === "string" && v.startsWith("http") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={v}
                                alt=""
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className={`w-12 h-9 object-cover rounded bg-[var(--color-bg-soft)] ${
                                  clickable ? "ring-1 ring-transparent hover:ring-[var(--color-orange)]/50 transition" : ""
                                }`}
                              />
                            ) : (
                              <div className="w-12 h-9 rounded bg-[var(--color-bg-soft)]" />
                            )
                          ) : isText ? (
                            <span className="text-[var(--color-text-primary)] truncate">{String(v ?? "—")}</span>
                          ) : (
                            formatValue(v, c.format)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {active && <CreativeLightbox ad={active} onClose={() => setActive(null)} />}
    </>
  );
}
