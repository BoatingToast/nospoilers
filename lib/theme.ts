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
  bg:        '#121214',
  surface:   '#1C1C20',
  surface2:  '#26262B',
  border:    '#2E2E34',

  primary:            '#26262B',
  primaryForeground:  '#F5F3F0',

  secondary:           '#F2665F',
  secondaryDim:        '#963E3A',
  secondaryForeground: '#1A0D0B',

  text:  '#F5F3F0',
  muted: '#B0AFB6',

  success: '#5CD198',
  danger:  '#FF849E',
  warning: '#F5C04E',
  info:    '#7DBAFF',

  tierEpic: '#5FD4C4',
} as const

export const BRAND = {
  primary:   THEME.primary,
  secondary: THEME.secondary,
} as const

/** Named categorical hues, tuned to stay readable on the dark surfaces. */
export const CHART_COLORS = {
  violet:  '#B294F5',
  red:     '#F2665F',
  emerald: '#5CD198',
  amber:   '#F5C04E',
  orange:  '#F59E5B',
  slate:   '#94939C',
  sky:     '#7DBAFF',
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
