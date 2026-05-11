"use client";

import { useState } from "react";
import { ImageIcon, Play } from "lucide-react";
import type { AggregateRow } from "@/lib/client-data/aggregate";
import { CreativeLightbox } from "./creative-lightbox";

const fmtMyr = (n: number) =>
  `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

/**
 * Visual grid of ad creatives with thumbnail + ad copy + KPIs.
 *
 * Source: ad-level rows from aggregateAdData(rows, "ad"). The thumbnail
 * URLs come from Peningads' /v1/ads creative.thumbnailUrl (Meta CDN) which
 * we now persist into ad_data.data.creative_thumbnail at sync time.
 *
 * Click a card to open the lightbox modal:
 *  - video creative → embedded Facebook video player (iframe), plays inline
 *  - image creative → larger image at native aspect
 *  - falls back to thumbnail at full size when neither URL is set
 */
export function CreativeGallery({ ads, limit = 12 }: { ads: AggregateRow[]; limit?: number }) {
  const [active, setActive] = useState<AggregateRow | null>(null);

  // Only render ads that have a creative thumbnail OR have substantive spend.
  // Skip the long tail of zero-spend, no-creative rows so the grid stays clean.
  const visible = ads
    .filter((a) => a.creativeThumbnail || a.spend > 0)
    .slice(0, limit);

  if (visible.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] overflow-hidden mb-4">
      <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold mb-0.5">
            Creatives
          </div>
          <div className="text-sm font-bold">
            {visible.length} ad{visible.length === 1 ? "" : "s"}
            {ads.length > visible.length && (
              <span className="text-[var(--color-text-muted)] font-normal">
                {" "}· {ads.length - visible.length} more without spend
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {visible.map((ad) => (
          <CreativeCard key={ad.key} ad={ad} onOpen={() => setActive(ad)} />
        ))}
      </div>

      {active && <CreativeLightbox ad={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function CreativeCard({ ad, onOpen }: { ad: AggregateRow; onOpen: () => void }) {
  const isPaused = ad.status?.toLowerCase().includes("paus");
  const isVideo = !!(ad.creativeVideoUrl || ad.creativeVideoId);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-orange)]/40 transition focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/40"
    >
      <div className="aspect-[1.2/1] bg-[var(--color-bg-soft)] relative overflow-hidden">
        {ad.creativeThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ad.creativeThumbnail}
            alt={ad.name}
            className="w-full h-full object-cover transition group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}
        {isVideo && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
            <span className="w-12 h-12 rounded-full bg-black/70 border border-white/40 flex items-center justify-center">
              <Play className="w-5 h-5 text-white" fill="currentColor" />
            </span>
          </span>
        )}
        {isVideo && (
          <span className="absolute top-2 left-2 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-black/60 text-white tracking-wider">
            Video
          </span>
        )}
        {ad.status && (
          <span
            className={`absolute top-2 right-2 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md ${
              isPaused
                ? "bg-amber-500/20 text-amber-300"
                : "bg-emerald-500/20 text-emerald-300"
            }`}
          >
            {ad.status}
          </span>
        )}
      </div>

      <div className="p-3">
        <div className="text-xs font-bold truncate mb-1" title={ad.name}>
          {ad.name}
        </div>
        {ad.creativeBody && (
          <p className="text-[10px] text-[var(--color-text-muted)] line-clamp-2 mb-2 leading-snug">
            {ad.creativeBody}
          </p>
        )}
        <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-[var(--color-border)]">
          <Metric label="Spend" value={fmtMyr(ad.spend)} />
          <Metric label="CTR" value={ad.impressions > 0 ? fmtPct(ad.ctr) : "—"} />
          <Metric
            label="ROAS"
            value={ad.roas > 0 ? `${ad.roas.toFixed(2)}×` : "—"}
            highlight={ad.roas > 0}
          />
        </div>
      </div>
    </button>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="text-[8px] uppercase tracking-wider text-[var(--color-text-muted)] font-bold">
        {label}
      </div>
      <div
        className={`text-[10px] font-mono font-bold mt-0.5 ${
          highlight ? "text-emerald-400" : "text-[var(--color-text-primary)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

