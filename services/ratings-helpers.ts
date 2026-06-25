/**
 * Shared helpers used by both ratings.ts and top-five.ts.
 * Extracted to avoid circular imports.
 */

/** Adaptive blend ratio: more ratings = lean more on the ratings-derived signal */
export function ratingBlendRatio(ratingCount: number): number {
  if (ratingCount >= 20) return 0.70
  if (ratingCount >= 10) return 0.55
  if (ratingCount >=  5) return 0.45
  return 0.30
}
