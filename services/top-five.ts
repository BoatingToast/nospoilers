/**
 * Top Five Movies Service
 * ───────────────────────
 * Manages the user's curated Top 5 list, its history snapshots,
 * and the DNA preview calculation that lets users see how swapping
 * a film will shift their taste profile before committing.
 */

import { prisma } from '@/lib/db'
import { recalcTasteProfile } from './ratings'
import type { DNAScores } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TopFiveEntry {
  tmdbId:      number
  title:       string
  posterPath:  string | null
  releaseDate: string | null
  genreIds:    number[]
  position:    number   // 1–5
}

export interface TopFiveSnapshot {
  id:      string
  movies:  TopFiveEntry[]
  savedAt: string
}

// Positional multipliers: #1 film matters most, #5 least.
export const TOP5_WEIGHTS: Record<number, number> = {
  1: 1.0,
  2: 0.9,
  3: 0.8,
  4: 0.7,
  5: 0.6,
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getTopFive(userId: string): Promise<TopFiveEntry[]> {
  const rows = await prisma.topFiveMovie.findMany({
    where:   { userId },
    orderBy: { position: 'asc' },
  })
  return rows.map(toEntry)
}

/**
 * Save a new Top 5.
 * - Snapshots the current list (for history/restore).
 * - Replaces all existing positions atomically.
 * - Triggers async DNA recalculation.
 */
export async function saveTopFive(
  userId:  string,
  movies:  TopFiveEntry[],
): Promise<void> {
  if (movies.length === 0 || movies.length > 5) {
    throw new Error('Top 5 must contain 1–5 movies')
  }

  // Snapshot current list before overwriting
  const current = await getTopFive(userId)
  if (current.length > 0) {
    await prisma.topFiveSnapshot.create({
      data: {
        userId,
        movies: current as unknown as object[],
      },
    })
    // Keep only the 10 most recent snapshots
    const old = await prisma.topFiveSnapshot.findMany({
      where:   { userId },
      orderBy: { savedAt: 'desc' },
      skip:    10,
      select:  { id: true },
    })
    if (old.length > 0) {
      await prisma.topFiveSnapshot.deleteMany({
        where: { id: { in: old.map(o => o.id) } },
      })
    }
  }

  // Replace all positions atomically
  await prisma.$transaction([
    prisma.topFiveMovie.deleteMany({ where: { userId } }),
    prisma.topFiveMovie.createMany({
      data: movies.map(m => ({
        userId,
        tmdbId:      m.tmdbId,
        title:       m.title,
        posterPath:  m.posterPath,
        releaseDate: m.releaseDate,
        genreIds:    m.genreIds,
        position:    m.position,
      })),
    }),
  ])

  // Trigger DNA recalc asynchronously
  void recalcTasteProfile(userId).catch(() => {})
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getTopFiveHistory(userId: string): Promise<TopFiveSnapshot[]> {
  const rows = await prisma.topFiveSnapshot.findMany({
    where:   { userId },
    orderBy: { savedAt: 'desc' },
    take:    10,
  })
  return rows.map(r => ({
    id:      r.id,
    movies:  (r.movies as unknown as TopFiveEntry[]),
    savedAt: r.savedAt.toISOString(),
  }))
}

export async function restoreTopFive(
  userId:     string,
  snapshotId: string,
): Promise<void> {
  const snap = await prisma.topFiveSnapshot.findFirst({
    where: { id: snapshotId, userId },
  })
  if (!snap) throw new Error('Snapshot not found')
  await saveTopFive(userId, snap.movies as unknown as TopFiveEntry[])
}

// ─── DNA Preview ─────────────────────────────────────────────────────────────
/**
 * Compute what the user's DNA would look like if they saved this proposed
 * Top 5 — without writing anything to the database.
 *
 * Returns: { current, predicted, deltas }
 *   current:   live DNA scores
 *   predicted: what the blend would produce
 *   deltas:    predicted - current (positive = increase)
 */
export async function previewTopFiveDNA(
  userId:  string,
  proposed: TopFiveEntry[],
): Promise<{
  current:   DNAScores
  predicted: DNAScores
  deltas:    Record<keyof DNAScores, number>
} | null> {
  const { computeMovieVibe }   = await import('./movie-vibe')
  const { ratingBlendRatio }   = await import('./ratings-helpers')

  const [profile, ratings] = await Promise.all([
    prisma.tasteProfile.findUnique({ where: { userId } }),
    prisma.movieRating.findMany({ where: { userId }, select: { tmdbId: true } }),
  ])
  if (!profile) return null

  const dims: (keyof DNAScores)[] = [
    'suspenseScore', 'emotionalImpactScore', 'complexityScore',
    'humorScore', 'realismScore', 'actionScore', 'darknessScore',
  ]

  const current: DNAScores = {
    suspenseScore:        profile.suspenseScore,
    emotionalImpactScore: profile.emotionalImpactScore,
    complexityScore:      profile.complexityScore,
    humorScore:           profile.humorScore,
    realismScore:         profile.realismScore,
    actionScore:          profile.actionScore,
    darknessScore:        profile.darknessScore,
  }

  // ── Compute Top 5 signal ──────────────────────────────────────────────────
  const t5Sums:    Record<keyof DNAScores, number> = Object.fromEntries(dims.map(d => [d, 0])) as Record<keyof DNAScores, number>
  const t5Weights: Record<keyof DNAScores, number> = Object.fromEntries(dims.map(d => [d, 0])) as Record<keyof DNAScores, number>

  for (const m of proposed) {
    const vibe = computeMovieVibe({
      id:                m.tmdbId,
      genres:            m.genreIds.map(id => ({ id, name: '' })),
      runtime:           null,
      vote_average:      7,
      vote_count:        200,
      popularity:        50,
      release_date:      m.releaseDate ?? '',
      original_language: 'en',
    })
    const w = TOP5_WEIGHTS[m.position] ?? 0.5
    for (const dim of dims) {
      t5Sums[dim]    += vibe[dim] * w
      t5Weights[dim] += w
    }
  }

  const t5Signal: Record<keyof DNAScores, number> = Object.fromEntries(
    dims.map(d => [d, t5Weights[d] > 0 ? t5Sums[d] / t5Weights[d] : current[d]])
  ) as Record<keyof DNAScores, number>

  // ── 3-way blend: Top 5 + ratings-derived + existing ──────────────────────
  const t5Share      = proposed.length >= 3 ? 0.35 : (proposed.length / 3) * 0.35
  const remaining    = 1 - t5Share
  const ratingShare  = ratingBlendRatio(ratings.length) * remaining
  const existingShare = remaining - ratingShare

  // Simulate: weighted blend of Top5 signal + current DNA
  // (we don't recompute the full ratings signal here — treat current as the ratings proxy)
  const simulated: DNAScores = Object.fromEntries(
    dims.map(dim => {
      const blended = t5Signal[dim] * t5Share + current[dim] * (1 - t5Share)
      return [dim, Math.min(10, Math.max(1, parseFloat(blended.toFixed(2))))]
    })
  ) as unknown as DNAScores

  const deltas = Object.fromEntries(
    dims.map(dim => [dim, parseFloat((simulated[dim] - current[dim]).toFixed(2))])
  ) as Record<keyof DNAScores, number>

  return { current, predicted: simulated, deltas }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function toEntry(row: {
  tmdbId: number; title: string; posterPath: string | null
  releaseDate: string | null; genreIds: number[]; position: number
}): TopFiveEntry {
  return {
    tmdbId:      row.tmdbId,
    title:       row.title,
    posterPath:  row.posterPath,
    releaseDate: row.releaseDate,
    genreIds:    row.genreIds,
    position:    row.position,
  }
}
