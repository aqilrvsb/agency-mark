/**
 * Authentic platform glyphs for the connect tiles. Drawn inline so each
 * tile carries the real brand identity (Facebook blue + f, Google
 * four-color G, TikTok dual-shadow note) instead of a generic Plug icon.
 *
 * These are simplified public-domain reconstructions of the official
 * wordmarks — not the trademarked vector files. Sized to render at
 * 28px inside a 56px rounded square.
 */

export function FacebookGlyph({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        fill="#ffffff"
        d="M19 32V18h4.43l.66-5.14H19V9.6c0-1.49.41-2.5 2.55-2.5h2.73V2.5c-.47-.06-2.09-.2-3.97-.2-3.93 0-6.62 2.4-6.62 6.81v3.75H10V18h4.69v14H19z"
      />
    </svg>
  );
}

/** Google "G" — the four-colour swoosh, no background. */
export function GoogleGlyph({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC04"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/**
 * TikTok music note. The dual cyan/magenta layered note creates the
 * signature chromatic-aberration shadow — same trick TikTok uses on
 * their own splash screen.
 */
export function TikTokGlyph({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <g>
        {/* Cyan ghost (offset slightly down-left) */}
        <path
          fill="#25F4EE"
          d="M22.5 10.7a8.07 8.07 0 0 1-4.7-1.5v7a6.34 6.34 0 1 1-5.5-6.28v3.5a2.86 2.86 0 1 0 2 2.78V2h3.5a4.85 4.85 0 0 0 4.7 4.84z"
          transform="translate(-1.4 1.4)"
          opacity="0.95"
        />
        {/* Magenta ghost (offset slightly up-right) */}
        <path
          fill="#FE2C55"
          d="M22.5 10.7a8.07 8.07 0 0 1-4.7-1.5v7a6.34 6.34 0 1 1-5.5-6.28v3.5a2.86 2.86 0 1 0 2 2.78V2h3.5a4.85 4.85 0 0 0 4.7 4.84z"
          transform="translate(1.4 -1.4)"
          opacity="0.95"
        />
        {/* White master */}
        <path
          fill="#ffffff"
          d="M22.5 10.7a8.07 8.07 0 0 1-4.7-1.5v7a6.34 6.34 0 1 1-5.5-6.28v3.5a2.86 2.86 0 1 0 2 2.78V2h3.5a4.85 4.85 0 0 0 4.7 4.84z"
        />
      </g>
    </svg>
  );
}

export interface PlatformBrand {
  label: string;
  description: string;
  /** Slug used by /api/client/connect/{slug} */
  slug: "facebook" | "google" | "tiktok";
  /** Hex of the official brand mark — drives icon-tile bg + glow */
  brandHex: string;
  /** rgb() triplet without parens — for box-shadow / radial-gradient rgba(...) */
  brandRgb: string;
  /** Inline SVG glyph component */
  Glyph: React.ComponentType<{ className?: string }>;
}

export const PLATFORM_BRANDS: PlatformBrand[] = [
  {
    label: "Facebook Ads",
    description: "Paid campaigns from Meta Ads Manager",
    slug: "facebook",
    brandHex: "#1877F2",
    brandRgb: "24, 119, 242",
    Glyph: FacebookGlyph,
  },
  {
    label: "Google Ads",
    description: "Search, Display, YouTube campaigns",
    slug: "google",
    // Google's brand has no single hex — use their well-known white-card
    // treatment with a thin border and a four-colour glyph that does the
    // identification work. The "brandHex" here is the soft canvas behind
    // the glyph, not a Google blue stamp.
    brandHex: "#ffffff",
    brandRgb: "255, 255, 255",
    Glyph: GoogleGlyph,
  },
  {
    label: "TikTok Ads",
    description: "TikTok Ads Manager campaigns",
    slug: "tiktok",
    brandHex: "#000000",
    brandRgb: "37, 244, 238", // we use the cyan accent for the glow
    Glyph: TikTokGlyph,
  },
];
