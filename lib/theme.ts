/**
 * JS-side mirror of the design tokens defined in app/globals.css.
 *
 * Almost everywhere in the app, colors should come from the `ns-*` Tailwind
 * classes or `rgb(var(--ns-*))` CSS values — those read live from globals.css
 * and are the actual source of truth for rebranding.
 *
 * This file exists only for the handful of places that need a literal color
 * string in JS rather than a CSS variable reference, because they render
 * outside a browser/DOM context where `var()` can't be resolved — e.g. the
 * Satori-based OG image route (app/api/og/**) and any per-instance color
 * picked from data (like a personality type's accent) that also needs to
 * work inside that route.
 *
 * Keep these values in sync with the corresponding custom properties in
 * app/globals.css.
 */

/** Full literal mirror of the :root custom properties in app/globals.css. */
export const THEME = {
  bg:        '#050814',
  surface:   '#0B0F24',
  surface2:  '#10152E',
  border:    '#1B2242',

  primary:            '#0F1B42',
  primaryForeground:  '#EDE9E1',

  secondary:           '#680DD1',
  secondaryDim:        '#46098D',
  secondaryForeground: '#FFFFFF',

  text:  '#EDE9E1',
  muted: '#9498BD',

  success: '#34D399',
  danger:  '#F87171',
  warning: '#FBBF24',
  info:    '#60A5FA',

  tierEpic: '#2DD4BF',
} as const

export const BRAND = {
  primary:   THEME.primary,
  secondary: THEME.secondary,
} as const

/** Mirrors --ns-chart-1..7 in app/globals.css. */
export const CHART_COLORS = {
  violet:  '#7C3AED',
  red:     '#DC2626',
  emerald: '#059669',
  amber:   '#D97706',
  orange:  '#EA580C',
  slate:   '#475569',
  sky:     '#0284C7',
} as const

/**
 * Shared "quality" color scale — used everywhere a rating/score/match needs
 * to go from worst to best (rating sliders, score dials, distribution
 * charts, compatibility/match badges). Takes a 0–1 fraction, not a raw
 * score, so callers on different scales (1–10, 1–100, percentages) all
 * normalize to the same ramp instead of re-declaring their own thresholds.
 */
export function ratingColor(fraction: number): string {
  if (fraction >= 0.8) return 'rgb(var(--ns-secondary))'
  if (fraction >= 0.6) return 'rgb(var(--ns-success))'
  if (fraction >= 0.4) return 'rgb(var(--ns-info))'
  if (fraction >= 0.2) return 'rgb(var(--ns-warning))'
  return 'rgb(var(--ns-muted))'
}

/** Text color that stays readable on top of a `ratingColor` fill. */
export function ratingTextColor(fraction: number): string {
  return fraction >= 0.8 ? 'rgb(var(--ns-secondary-foreground))' : 'rgb(var(--ns-bg))'
}
