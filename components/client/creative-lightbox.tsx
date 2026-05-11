"use client";

import { useEffect, useCallback } from "react";
import { ImageIcon, X } from "lucide-react";

const fmtMyr = (n: number) =>
  `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

export interface CreativeLightboxData {
  name: string;
  status?: string | null;
  campaignName?: string | null;
  adsetName?: string | null;
  creativeBody?: string | null;
  creativeThumbnail?: string | null;
  creativeImageUrl?: string | null;
  creativeVideoUrl?: string | null;
  creativeVideoId?: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  roas: number;
}

/**
 * Modal lightbox for an ad creative. Picks the best media to show:
 *   1. Video → Facebook video plugin iframe (plays inline, cross-origin safe)
 *   2. Hi-res image URL (creativeImageUrl)
 *   3. Thumbnail URL at native aspect (fallback)
 *
 * Esc to close, click backdrop to close. Used by both /client/campaign/[id]
 * (creative gallery cards) and /marketer/reports/[id] (Ad-level rows).
 */
export function CreativeLightbox({
  ad,
  onClose,
}: {
  ad: CreativeLightboxData;
  onClose: () => void;
}) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prev;
    };
  }, [handleKey]);

  const videoEmbed = ad.creativeVideoUrl
    ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(ad.creativeVideoUrl)}&show_text=false&autoplay=true`
    : ad.creativeVideoId
      ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(`https://www.facebook.com/watch/?v=${ad.creativeVideoId}`)}&show_text=false&autoplay=true`
      : null;

  const fallbackImage = ad.creativeImageUrl ?? ad.creativeThumbnail ?? null;
  const isPaused = ad.status?.toLowerCase().includes("paus");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Creative preview: ${ad.name}`}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/15 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="bg-black flex items-center justify-center" style={{ minHeight: "240px" }}>
          {videoEmbed ? (
            <iframe
              src={videoEmbed}
              title={ad.name}
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="no-referrer"
              className="w-full"
              style={{ aspectRatio: "16 / 9", border: 0 }}
            />
          ) : fallbackImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fallbackImage}
              alt={ad.name}
              referrerPolicy="no-referrer"
              className="max-h-[70vh] w-auto object-contain"
            />
          ) : (
            <div className="text-[var(--color-text-muted)] py-16 text-center">
              <ImageIcon className="w-12 h-12 mx-auto mb-2" />
              <div className="text-sm">No creative available</div>
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-extrabold text-lg leading-tight" title={ad.name}>
                {ad.name}
              </h3>
              {ad.campaignName && (
                <div className="text-xs text-[var(--color-text-muted)] mt-1">
                  {ad.campaignName}
                  {ad.adsetName && <> · {ad.adsetName}</>}
                </div>
              )}
            </div>
            {ad.status && (
              <span
                className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${
                  isPaused
                    ? "bg-amber-500/15 text-amber-300"
                    : "bg-emerald-500/15 text-emerald-300"
                }`}
              >
                {ad.status}
              </span>
            )}
          </div>

          {ad.creativeBody && (
            <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-line mb-4 max-h-40 overflow-y-auto">
              {ad.creativeBody}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-[var(--color-border)]">
            <BigMetric label="Spend" value={fmtMyr(ad.spend)} />
            <BigMetric label="CTR" value={ad.impressions > 0 ? fmtPct(ad.ctr) : "—"} />
            <BigMetric label="Clicks" value={ad.clicks.toLocaleString()} />
            <BigMetric label="Impr." value={ad.impressions.toLocaleString()} />
            <BigMetric
              label="ROAS"
              value={ad.roas > 0 ? `${ad.roas.toFixed(2)}×` : "—"}
              highlight={ad.roas > 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BigMetric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-bold">
        {label}
      </div>
      <div
        className={`text-base font-mono font-bold tabular-nums mt-0.5 ${
          highlight ? "text-emerald-400" : "text-[var(--color-text-primary)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
