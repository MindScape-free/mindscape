// ── Admin Color Theme Definitions ────────────────────────────
// Pure data — no React dependencies, safe to import from any file.
// These Tailwind class bundles allow dynamic color theming of admin UI cards,
// stats, and analytics breakdowns without inline object creation on every render.
// ────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────

export type ColorThemeKey = 'violet' | 'indigo' | 'blue' | 'emerald' | 'yellow' | 'orange' | 'pink' | 'sky' | 'cyan';

/**
 * Full theme bundle used by analytics sections (UserMapAnalytics, AllTimeAnalytics).
 * Covers: text, background, border, hover, and group-hover states for the
 * color-coded stat cards and breakdown grids.
 */
export interface ColorTheme {
  text400: string;
  text400Muted: string;
  bg500_5: string;
  bg500_10: string;
  bg500_20: string;
  border500_15: string;
  border500_20: string;
  hoverBg500_10: string;
  hoverBorder500_30: string;
  groupHoverText: string;
}

/**
 * Compact theme bundle used by the 10-stat grid in UserDetailDialog.
 * A subset of ColorTheme with only the classes needed for inline stat cards.
 */
export interface StatCardTheme {
  bg: string;
  border: string;
  text: string;
  glow: string;
  bgHover: string;
}

// ─── Full Themes ──────────────────────────────────────────────

export const fullThemes: Record<ColorThemeKey, ColorTheme> = {
  violet: {
    text400: 'text-violet-400',
    text400Muted: 'text-violet-400/70',
    bg500_5: 'bg-violet-500/5',
    bg500_10: 'bg-violet-500/10',
    bg500_20: 'bg-violet-500/20',
    border500_15: 'border-violet-500/15',
    border500_20: 'border-violet-500/20',
    hoverBg500_10: 'hover:bg-violet-500/10',
    hoverBorder500_30: 'hover:border-violet-500/30',
    groupHoverText: 'group-hover/source:text-violet-400',
  },
  indigo: {
    text400: 'text-indigo-400',
    text400Muted: 'text-indigo-400/70',
    bg500_5: 'bg-indigo-500/5',
    bg500_10: 'bg-indigo-500/10',
    bg500_20: 'bg-indigo-500/20',
    border500_15: 'border-indigo-500/15',
    border500_20: 'border-indigo-500/20',
    hoverBg500_10: 'hover:bg-indigo-500/10',
    hoverBorder500_30: 'hover:border-indigo-500/30',
    groupHoverText: 'group-hover/source:text-indigo-400',
  },
  blue: {
    text400: 'text-blue-400',
    text400Muted: 'text-blue-400/70',
    bg500_5: 'bg-blue-500/5',
    bg500_10: 'bg-blue-500/10',
    bg500_20: 'bg-blue-500/20',
    border500_15: 'border-blue-500/15',
    border500_20: 'border-blue-500/20',
    hoverBg500_10: 'hover:bg-blue-500/10',
    hoverBorder500_30: 'hover:border-blue-500/30',
    groupHoverText: 'group-hover/source:text-blue-400',
  },
  emerald: {
    text400: 'text-emerald-400',
    text400Muted: 'text-emerald-400/70',
    bg500_5: 'bg-emerald-500/5',
    bg500_10: 'bg-emerald-500/10',
    bg500_20: 'bg-emerald-500/20',
    border500_15: 'border-emerald-500/15',
    border500_20: 'border-emerald-500/20',
    hoverBg500_10: 'hover:bg-emerald-500/10',
    hoverBorder500_30: 'hover:border-emerald-500/30',
    groupHoverText: 'group-hover/source:text-emerald-400',
  },
  yellow: {
    text400: 'text-amber-400',
    text400Muted: 'text-amber-400/70',
    bg500_5: 'bg-amber-500/5',
    bg500_10: 'bg-amber-500/10',
    bg500_20: 'bg-amber-500/20',
    border500_15: 'border-amber-500/15',
    border500_20: 'border-amber-500/20',
    hoverBg500_10: 'hover:bg-amber-500/10',
    hoverBorder500_30: 'hover:border-amber-500/30',
    groupHoverText: 'group-hover/source:text-amber-400',
  },
  orange: {
    text400: 'text-orange-400',
    text400Muted: 'text-orange-400/70',
    bg500_5: 'bg-orange-500/5',
    bg500_10: 'bg-orange-500/10',
    bg500_20: 'bg-orange-500/20',
    border500_15: 'border-orange-500/15',
    border500_20: 'border-orange-500/20',
    hoverBg500_10: 'hover:bg-orange-500/10',
    hoverBorder500_30: 'hover:border-orange-500/30',
    groupHoverText: 'group-hover/source:text-orange-400',
  },
  pink: {
    text400: 'text-pink-400',
    text400Muted: 'text-pink-400/70',
    bg500_5: 'bg-pink-500/5',
    bg500_10: 'bg-pink-500/10',
    bg500_20: 'bg-pink-500/20',
    border500_15: 'border-pink-500/15',
    border500_20: 'border-pink-500/20',
    hoverBg500_10: 'hover:bg-pink-500/10',
    hoverBorder500_30: 'hover:border-pink-500/30',
    groupHoverText: 'group-hover/source:text-pink-400',
  },
  sky: {
    text400: 'text-sky-400',
    text400Muted: 'text-sky-400/70',
    bg500_5: 'bg-sky-500/5',
    bg500_10: 'bg-sky-500/10',
    bg500_20: 'bg-sky-500/20',
    border500_15: 'border-sky-500/15',
    border500_20: 'border-sky-500/20',
    hoverBg500_10: 'hover:bg-sky-500/10',
    hoverBorder500_30: 'hover:border-sky-500/30',
    groupHoverText: 'group-hover/source:text-sky-400',
  },
  cyan: {
    text400: 'text-cyan-400',
    text400Muted: 'text-cyan-400/70',
    bg500_5: 'bg-cyan-500/5',
    bg500_10: 'bg-cyan-500/10',
    bg500_20: 'bg-cyan-500/20',
    border500_15: 'border-cyan-500/15',
    border500_20: 'border-cyan-500/20',
    hoverBg500_10: 'hover:bg-cyan-500/10',
    hoverBorder500_30: 'hover:border-cyan-500/30',
    groupHoverText: 'group-hover/source:text-cyan-400',
  },
};

// ─── Compact (Stat Card) Themes ───────────────────────────────

/**
 * Compact theme map used for inline stat cards in the 10-grid stats section.
 * Contains a subset of colors with fewer properties per entry.
 */
export const statCardThemes: Record<string, StatCardTheme> = {
  violet: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    text: 'text-violet-400',
    glow: 'bg-violet-500/[0.03]',
    bgHover: 'group-hover:bg-violet-500/20',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    text: 'text-indigo-400',
    glow: 'bg-indigo-500/[0.03]',
    bgHover: 'group-hover:bg-indigo-500/20',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    glow: 'bg-blue-500/[0.03]',
    bgHover: 'group-hover:bg-blue-500/20',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    glow: 'bg-emerald-500/[0.03]',
    bgHover: 'group-hover:bg-emerald-500/20',
  },
  pink: {
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    text: 'text-pink-400',
    glow: 'bg-pink-500/[0.03]',
    bgHover: 'group-hover:bg-pink-500/20',
  },
  yellow: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    glow: 'bg-amber-500/[0.03]',
    bgHover: 'group-hover:bg-amber-500/20',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    text: 'text-orange-400',
    glow: 'bg-orange-500/[0.03]',
    bgHover: 'group-hover:bg-orange-500/20',
  },
  sky: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    text: 'text-sky-400',
    glow: 'bg-sky-500/[0.03]',
    bgHover: 'group-hover:bg-sky-500/20',
  },
};

// ─── Helper Functions ─────────────────────────────────────────

/** Get a full theme by color key, falling back to violet on unknown keys. */
export function getFullTheme(color: string): ColorTheme {
  return fullThemes[color as ColorThemeKey] || fullThemes.violet;
}

/** Get a compact stat card theme by color key, falling back to violet on unknown keys. */
export function getStatCardTheme(color: string): StatCardTheme {
  return statCardThemes[color] || statCardThemes.violet;
}
