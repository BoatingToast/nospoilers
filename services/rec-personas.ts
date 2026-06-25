/**
 * rec-personas.ts
 *
 * Generates dynamic "themed" recommendation groups (Personas) from the user's:
 *   - Favorite movies (one persona per top-3 favorites: "Movies That Feel Like X")
 *   - Top DNA traits (one trait-driven persona: "Emotionally Powerful Films" etc.)
 *
 * Each persona has 5-6 movie suggestions scored against the specific signal.
 */

import { prisma } from '@/lib/db'
import { getMovieRecommendations, getMovieSimilar } from './tmdb'
import { computeMovieVibe } from './movie-vibe'
import type { DNAScores, TMDbMovie, RecPersona, EnrichedRecForPersona } from '@/types'

// ─── DNA trait display config ─────────────────────────────────────────────────

const DNA_TRAIT_PERSONAS: Record<
  string,
  { title: string; icon: string; description: string }
> = {
  complexityScore:      { title: 'Mind-Bending Films for Thinkers',  icon: '🧩', description: 'Layered stories that reward close attention' },
  emotionalImpactScore: { title: 'Emotionally Powerful Films',        icon: '❤️', description: 'Films that stay with you long after the credits' },
  suspenseScore:        { title: 'Edge-of-Your-Seat Thrillers',       icon: '⚡', description: 'Unrelenting tension from first frame to last' },
  darknessScore:        { title: 'Dark & Intense Cinema',             icon: '🌑', description: 'Films that don\'t flinch from the human condition' },
  actionScore:          { title: 'High-Octane Action',                icon: '💥', description: 'Kinetic cinema built for the big screen' },
  humorScore:           { title: 'Brilliantly Funny Films',           icon: '😄', description: 'Smart comedy with real cinematic craft' },
  realismScore:         { title: 'Grounded Realist Drama',            icon: '🎯', description: 'Cinema that feels like lived experience' },
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getRecPersonas(userId: string): Promise<RecPersona[]> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      onboardingMovies: {
        select:  { tmdbId: true, title: true, genreIds: true },
        orderBy: { addedAt: 'asc' },
      },
      tasteProfile: true,
      watchlistItems: { select: { tmdbId: true } },
      movieRatings:   { select: { tmdbId: true } },
    },
  })

  if (!user || user.onboardingMovies.length === 0) return []

  const seenIds = new Set<number>([
    ...user.onboardingMovies.map(m => m.tmdbId),
    ...user.watchlistItems.map(r => r.tmdbId),
    ...user.movieRatings.map(r => r.tmdbId),
  ])

  const userDNA: DNAScores = user.tasteProfile
    ? extractDNA(user.tasteProfile)
    : neutralDNA()

  const personas: RecPersona[] = []

  // ── Persona type A: "Movies That Feel Like {FavTitle}" ────────────────────
  // Use top 3 favorites, generate one persona each
  const top3Favs = user.onboardingMovies.slice(0, 3)

  await Promise.allSettled(
    top3Favs.map(async fav => {
      const [recRes, simRes] = await Promise.allSettled([
        getMovieRecommendations(fav.tmdbId),
        getMovieSimilar(fav.tmdbId),
      ])

      const candidates: TMDbMovie[] = []
      if (recRes.status === 'fulfilled') candidates.push(...recRes.value.results)
      if (simRes.status === 'fulfilled') candidates.push(...simRes.value.results)

      // Score against the specific favorite's genre DNA
      const favMovieDNA = computeMovieVibe({
        id: fav.tmdbId,
        genres: (fav.genreIds ?? []).map(id => ({ id, name: '' })),
        runtime: null, vote_average: 7.5, vote_count: 500,
        popularity: 50, release_date: '2010-01-01', original_language: 'en',
      })

      const deduped = new Map<number, TMDbMovie>()
      for (const m of candidates) {
        if (!seenIds.has(m.id) && m.poster_path && m.vote_count >= 80)
          deduped.set(m.id, m)
      }

      const scoredForFav = [...deduped.values()]
        .map(m => {
          const movieDNA = computeMovieVibe({
            id: m.id,
            genres: (m.genre_ids ?? []).map(id => ({ id, name: '' })),
            runtime: null, vote_average: m.vote_average, vote_count: m.vote_count,
            popularity: m.popularity, release_date: m.release_date, original_language: m.original_language,
          })
          // Score = similarity to the specific favorite's DNA
          const diff  = Object.keys(favMovieDNA).reduce(
            (s, k) => s + Math.abs(movieDNA[k as keyof DNAScores] - favMovieDNA[k as keyof DNAScores]), 0
          )
          const score = Math.max(0, Math.round(100 - diff * 7))
          return { m, score, movieDNA }
        })
        .filter(x => x.score >= 50)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)

      if (scoredForFav.length < 3) return  // skip thin personas

      personas.push({
        id:          `like-${fav.tmdbId}`,
        title:       `Movies That Feel Like ${fav.title}`,
        icon:        '🎬',
        description: `Recommendations with a similar cinematic DNA to ${fav.title}`,
        movies:      scoredForFav.map(({ m, score }) => ({
          tmdbId:      m.id,
          title:       m.title,
          posterPath:  m.poster_path,
          releaseDate: m.release_date,
          matchScore:  score,
          explanation: `Shares the atmosphere and DNA of ${fav.title}.`,
        } satisfies EnrichedRecForPersona)),
      })
    })
  )

  // ── Persona type B: Top DNA trait persona ─────────────────────────────────
  // Find the user's single strongest DNA dimension and build a trait-driven persona
  const DNA_KEYS = Object.keys(DNA_TRAIT_PERSONAS) as (keyof DNAScores)[]
  const topTrait = DNA_KEYS.reduce(
    (best, k) => userDNA[k] > userDNA[best] ? k : best,
    DNA_KEYS[0]
  )

  const traitConfig = DNA_TRAIT_PERSONAS[topTrait as string]
  if (traitConfig && userDNA[topTrait] >= 6.0) {
    // Collect all already-scored candidates across favorite pools
    const allCandidates = new Map<number, { movie: TMDbMovie; traitScore: number }>()

    await Promise.allSettled(
      top3Favs.map(async fav => {
        const res = await getMovieRecommendations(fav.tmdbId).catch(() => ({ results: [] }))
        for (const m of res.results) {
          if (seenIds.has(m.id) || !m.poster_path || m.vote_count < 80) continue
          if (allCandidates.has(m.id)) continue
          const movieDNA = computeMovieVibe({
            id: m.id,
            genres: (m.genre_ids ?? []).map(id => ({ id, name: '' })),
            runtime: null, vote_average: m.vote_average, vote_count: m.vote_count,
            popularity: m.popularity, release_date: m.release_date, original_language: m.original_language,
          })
          allCandidates.set(m.id, { movie: m, traitScore: movieDNA[topTrait] })
        }
      })
    )

    const traitMovies = [...allCandidates.values()]
      .filter(x => x.traitScore >= 6.5)
      .sort((a, b) => b.traitScore - a.traitScore)
      .slice(0, 5)

    if (traitMovies.length >= 3) {
      personas.push({
        id:          `trait-${String(topTrait)}`,
        title:       traitConfig.title,
        icon:        traitConfig.icon,
        description: traitConfig.description,
        movies:      traitMovies.map(({ movie, traitScore }) => ({
          tmdbId:      movie.id,
          title:       movie.title,
          posterPath:  movie.poster_path,
          releaseDate: movie.release_date,
          matchScore:  Math.round(traitScore * 10),
          explanation: `Scores ${traitScore.toFixed(1)}/10 on ${traitConfig.title.toLowerCase()}.`,
        } satisfies EnrichedRecForPersona)),
      })
    }
  }

  return personas.slice(0, 4)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractDNA(p: {
  suspenseScore: number; emotionalImpactScore: number; complexityScore: number
  humorScore: number; realismScore: number; actionScore: number; darknessScore: number
}): DNAScores {
  return {
    suspenseScore:        p.suspenseScore,
    emotionalImpactScore: p.emotionalImpactScore,
    complexityScore:      p.complexityScore,
    humorScore:           p.humorScore,
    realismScore:         p.realismScore,
    actionScore:          p.actionScore,
    darknessScore:        p.darknessScore,
  }
}

function neutralDNA(): DNAScores {
  return { suspenseScore: 5, emotionalImpactScore: 5, complexityScore: 5,
           humorScore: 5, realismScore: 5, actionScore: 5, darknessScore: 5 }
}
