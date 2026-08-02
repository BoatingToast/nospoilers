/**
 * curated-recs.ts
 *
 * Produces five personalised recommendation groups powered by:
 *   • Movie DNA (computeMovieVibe)
 *   • User taste profile (TasteProfile)
 *   • Favorite movies (onboardingMovies)
 *   • Favorite genres (UserPreferences)
 *   • Watch history + ratings (WatchlistItem / MovieRating)
 *
 * Groups:
 *   1. "We Think You'd Like"   — highest overall match score
 *   2. "Similar To Favorites"  — explicitly tied to a specific favorite film
 *   3. "Based On Your DNA"      — strongest Movie DNA trait alignment
 *   4. "Expand Your Taste"      — scores well on the user's weakest DNA traits
 *   5. "Rediscover Classics"    — pre-1990 films that align with user DNA
 */

import { prisma } from '@/lib/db'
import {
  getMovieRecommendations,
  getMovieSimilar,
  getMoviesByGenre,
  getTopRatedMovies,
} from './tmdb'
import { computeMovieVibe } from './movie-vibe'
import {
  buildGenreAffinities,
  pickDiverseRecommendations,
  scoreGenreAffinity,
  selectPositiveRatingAnchors,
  type GenreAffinity,
} from './recommendation-ranking'
import { loadRecommendationRatingRows } from './recommendation-rating-evidence'
import type { DNAScores, TMDbMovie } from '@/types'

// ─── Public types ──────────────────────────────────────────────────────────────

export type RecGroup =
  | 'we-think-youd-like'
  | 'similar-to-favorites'
  | 'dna-based-picks'
  | 'expand-your-taste'
  | 'rediscover-classics'

export interface MatchedTrait {
  trait:       string   // e.g. "Complexity"
  icon:        string   // emoji
  yourScore:   number   // user's DNA score on this trait
  movieScore:  number   // movie's DNA score on this trait
}

export interface MatchedRating {
  title: string
  score: number
}

export interface EnrichedRec {
  tmdbId:           number
  title:            string
  posterPath:       string | null
  releaseDate:      string | null
  voteAverage:      number
  genreIds:         number[]
  matchScore:       number   // 0-100
  group:            RecGroup
  explanation:      string   // one compelling sentence
  // Attribution (used by Why? modal)
  matchedFavorites: string[]       // "Because you liked …"
  matchedRatings:   MatchedRating[] // "Because you rated …"
  matchedLikedPicks: string[]      // positive recommendation feedback
  matchedGenres:    string[]       // genres the user prefers that appear in this film
  matchedTraits:    MatchedTrait[] // DNA dimensions that align
  ratingInsight:    string | null  // e.g. "You rate sci-fi films 83/100 on average"
  // Internal: computed vibe stored so Expand group can reuse without a second call
  _movieDNA?:       DNAScores
  // Group-specific extras
  similarToTitle?:  string   // "Similar To Favorites" — which favorite drove this
  expandTrait?:     string   // "Expand Taste" — which weak trait this expands
  classicEra?:      string   // "Rediscover Classics" — decade label
}

export interface CuratedRecGroups {
  nextFavorite:       EnrichedRec | null        // single highest-confidence pick
  weThinkYoudLike:    EnrichedRec[]
  similarToFavorites: EnrichedRec[]
  dnaBasedPicks:      EnrichedRec[]             // pure DNA / top-trait driven
  expandYourTaste:    EnrichedRec[]
  rediscoverClassics: EnrichedRec[]
  // Per-trait context for the DNA section UI
  topTraits:          Array<{ label: string; icon: string; score: number }>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GENRE_ID_TO_NAME: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
}

const GENRE_NAME_TO_ID: Record<string, number> = {
  action: 28, adventure: 12, animation: 16, comedy: 35,
  crime: 80, documentary: 99, drama: 18, family: 10751,
  fantasy: 14, history: 36, horror: 27, music: 10402,
  mystery: 9648, romance: 10749, 'sci-fi': 878, thriller: 53,
  war: 10752, western: 37,
}

const DNA_META: Record<keyof DNAScores, { label: string; icon: string }> = {
  suspenseScore:        { label: 'Suspense',         icon: '⚡' },
  emotionalImpactScore: { label: 'Emotion',           icon: '❤️' },
  complexityScore:      { label: 'Complexity',        icon: '🧩' },
  humorScore:           { label: 'Humor',             icon: '😄' },
  realismScore:         { label: 'Realism',           icon: '🎯' },
  actionScore:          { label: 'Action',            icon: '💥' },
  darknessScore:        { label: 'Darkness',          icon: '🌑' },
}

const DNA_KEYS = Object.keys(DNA_META) as (keyof DNAScores)[]

type RecommendationAnchor = {
  tmdbId: number
  title: string
  kind: 'favorite' | 'rating' | 'liked-pick'
  score?: number
  affinity?: number
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getCuratedRecs(userId: string): Promise<CuratedRecGroups> {
  // ── 1. Fetch all user signals ─────────────────────────────────────────────
  const [user, watchlistRows, ratingRows, membershipRows, feedbackRows] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: {
        tasteProfile:     true,
        onboardingMovies: {
          select:  { tmdbId: true, title: true, genreIds: true, posterPath: true },
          orderBy: { addedAt: 'asc' },
        },
        preferences: { select: { genres: true } },
      },
    }),
    prisma.watchlistItem.findMany({ where: { userId }, select: { tmdbId: true, status: true, genreIds: true } }),
    loadRecommendationRatingRows(
      () => prisma.movieRating.findMany({
        where:  { userId },
        select: { tmdbId: true, title: true, score: true, genreIds: true },
      }),
      () => prisma.movieRating.findMany({
        where:  { userId },
        select: { tmdbId: true, title: true, score: true },
      }),
    ),
    // Spoiler Zone memberships — weak additional genre signal
    prisma.spoilerZoneMembership.findMany({
      where:  { userId },
      select: { tmdbId: true },
    }),
    // Keep dismissed / already-seen recommendations out of future shelves and
    // reuse positive feedback as a light source for new candidates.
    prisma.recommendationFeedback.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    50,
      select: {
        feedback: true,
        recommendation: { select: { tmdbId: true, title: true } },
      },
    }),
  ])

  if (!user) return empty()

  const userDNA: DNAScores = user.tasteProfile
    ? extractDNA(user.tasteProfile)
    : neutralDNA()

  const favorites   = user.onboardingMovies
  const userGenres  = (user.preferences?.genres ?? []).map(g => g.toLowerCase())

  // All tmdbIds the user has already encountered — exclude from recommendations
  // Include SZ memberships: user has seen (or is very interested in) those films
  const membershipTmdbIds = new Set(membershipRows.map(m => m.tmdbId))
  const feedbackTmdbIds = new Set(feedbackRows.map(row => row.recommendation.tmdbId))
  const seenIds = new Set<number>([
    ...favorites.map(m => m.tmdbId),
    ...watchlistRows.map(r => r.tmdbId),
    ...ratingRows.map(r => r.tmdbId),
    ...membershipTmdbIds,
    ...feedbackTmdbIds,
  ])

  // ── 2. Build rating genre affinity ────────────────────────────────────────
  // MovieRating already carries cached TMDb genre evidence. Using it directly
  // means every rating can shape the shelf, not only ratings whose movie also
  // happens to be present in the watchlist.
  const ratingGenreAffinity = buildGenreAffinities(ratingRows)

  // Spoiler Zone memberships → weak positive genre signal.
  // Use watchlist genreIds for membership movies if available (they were already fetched)
  const watchlistGenreMap = new Map(watchlistRows.map(r => [r.tmdbId, r.genreIds ?? []]))
  for (const tmdbId of membershipTmdbIds) {
    const genreIds = watchlistGenreMap.get(tmdbId) ?? []
    for (const gid of genreIds) {
      const entry = ratingGenreAffinity.get(gid)
      if (!entry) {
        ratingGenreAffinity.set(gid, { averageScore: 65, signal: 0.1, count: 1 })
      } else {
        const nextCount = entry.count + 1
        ratingGenreAffinity.set(gid, {
          averageScore: (entry.averageScore * entry.count + 65) / nextCount,
          signal:       (entry.signal * entry.count + 0.1) / nextCount,
          count:        nextCount,
        })
      }
    }
  }

  // ── 3. Gather candidate pools ─────────────────────────────────────────────
  const take5Favs = favorites.slice(0, 5)
  const favoriteIds = new Set(take5Favs.map(favorite => favorite.tmdbId))
  const ratingAnchors = selectPositiveRatingAnchors(ratingRows, 5)
    .filter(rating => !favoriteIds.has(rating.tmdbId))
    .slice(0, 4)
  const likedPickAnchors = feedbackRows
    .filter(row => row.feedback === 'liked' || row.feedback === 'watchlist')
    .map(row => row.recommendation)
    .filter(rec => !favoriteIds.has(rec.tmdbId) && !ratingAnchors.some(rating => rating.tmdbId === rec.tmdbId))
    .slice(0, 2)

  const sourceAnchors: RecommendationAnchor[] = [
    ...take5Favs.map(favorite => ({
      tmdbId: favorite.tmdbId,
      title:  favorite.title,
      kind:   'favorite' as const,
    })),
    ...ratingAnchors.map(rating => ({
      tmdbId:    rating.tmdbId,
      title:     rating.title,
      kind:      'rating' as const,
      score:     rating.score,
      affinity:  rating.affinity,
    })),
    ...likedPickAnchors.map(rec => ({
      tmdbId: rec.tmdbId,
      title:  rec.title,
      kind:   'liked-pick' as const,
    })),
  ]

  const positiveRatingGenreIds = [...ratingGenreAffinity.entries()]
    .filter(([, affinity]) => affinity.signal > 0.15)
    .sort((a, b) => (b[1].signal * Math.sqrt(b[1].count)) - (a[1].signal * Math.sqrt(a[1].count)))
    .map(([genreId]) => genreId)
  const discoveryGenreIds = [...new Set([
    ...userGenres.map(genre => GENRE_NAME_TO_ID[genre]).filter((id): id is number => Boolean(id)),
    ...positiveRatingGenreIds,
  ])].slice(0, 3)

  const [recResults, similarResults, genreResults, classicPageResults] = await Promise.all([
    // TMDb recs for favorites, highly rated films, and previously liked picks
    Promise.allSettled(sourceAnchors.map(anchor => getMovieRecommendations(anchor.tmdbId))),
    // TMDb similar for each favorite (different signal than recs)
    Promise.allSettled(take5Favs.map(f => getMovieSimilar(f.tmdbId))),
    // Genre discovery combines explicit preferences with actual rating history.
    Promise.allSettled(
      discoveryGenreIds.map(id => getMoviesByGenre(id, 1))
    ),
    // Top-rated all time across pages 1-3 (for classics pool — we need pre-1990 films)
    Promise.allSettled([
      getTopRatedMovies(1),
      getTopRatedMovies(2),
      getTopRatedMovies(3),
    ]),
  ])

  // Deduplicate all candidates into a flat map keyed by tmdbId
  const allMovies = new Map<number, { movie: TMDbMovie; sources: RecommendationAnchor[] }>()

  function addCandidate(movie: TMDbMovie, source?: RecommendationAnchor) {
    if (seenIds.has(movie.id) || !movie.poster_path || movie.vote_count < 80) return
    const existing = allMovies.get(movie.id)
    if (!existing) {
      allMovies.set(movie.id, { movie, sources: source ? [source] : [] })
      return
    }
    if (source && !existing.sources.some(item => item.tmdbId === source.tmdbId && item.kind === source.kind)) {
      existing.sources.push(source)
    }
  }

  recResults.forEach((result, index) => {
    if (result.status !== 'fulfilled') return
    for (const movie of result.value.results) addCandidate(movie, sourceAnchors[index])
  })

  similarResults.forEach((result, index) => {
    if (result.status !== 'fulfilled') return
    const favorite = take5Favs[index]
    const source: RecommendationAnchor = {
      tmdbId: favorite.tmdbId,
      title:  favorite.title,
      kind:   'favorite',
    }
    for (const movie of result.value.results) addCandidate(movie, source)
  })

  // Add genre-based candidates (no specific favorite attribution)
  for (const r of genreResults) {
    if (r.status !== 'fulfilled') continue
    for (const movie of r.value.results) addCandidate(movie)
  }

  // Classic pool: merge top-rated pages 1-3, filter to pre-1990
  const classicMoviesRaw: TMDbMovie[] = []
  const classicSeen = new Set<number>()
  for (const r of classicPageResults) {
    if (r.status !== 'fulfilled') continue
    for (const m of r.value.results) {
      if (!classicSeen.has(m.id)) { classicSeen.add(m.id); classicMoviesRaw.push(m) }
    }
  }
  const classicPool: TMDbMovie[] = classicMoviesRaw
    .filter(m =>
      !seenIds.has(m.id) &&
      m.poster_path &&
      m.vote_count >= 500 &&
      m.vote_average >= 7.5 &&
      m.release_date &&
      parseInt(m.release_date.slice(0, 4), 10) < 1990
    )

  // ── 4. Score every candidate ──────────────────────────────────────────────
  const scored: EnrichedRec[] = []

  for (const [, { movie, sources }] of allMovies) {
    const enriched = scoreMovie({
      movie,
      sources,
      favorites,
      userDNA,
      hasTasteProfile: Boolean(user.tasteProfile),
      userGenres,
      ratingGenreAffinity,
    })
    if (enriched && enriched.matchScore > 10) scored.push(enriched)
  }

  // Also score classics separately
  const scoredClassics: EnrichedRec[] = []
  for (const movie of classicPool) {
    const enriched = scoreMovie({
      movie,
      sources: [],
      favorites,
      userDNA,
      hasTasteProfile: Boolean(user.tasteProfile),
      userGenres,
      ratingGenreAffinity,
    })
    if (enriched && enriched.matchScore > 10) {
      const year   = parseInt(movie.release_date.slice(0, 4), 10)
      const decade = `${Math.floor(year / 10) * 10}s`
      scoredClassics.push({ ...enriched, group: 'rediscover-classics', classicEra: decade })
    }
  }

  scored.sort((a, b) => b.matchScore - a.matchScore)

  // ── 5. Partition into groups ──────────────────────────────────────────────
  const usedIds = new Set<number>()

  // Group 1 — "We Think You'd Like": highest confidence, lightly reranked so
  // the shelf is not filled by near-identical movies from a single genre.
  const weThinkYoudLike = pickDiverseRecommendations(scored, 8)
    .map(r => { usedIds.add(r.tmdbId); return { ...r, group: 'we-think-youd-like' as RecGroup } })

  // Group 2 — "Similar To Favorites": best match per favorite (must have explicit attribution)
  const simToFavsMap = new Map<string, EnrichedRec>()
  for (const rec of scored) {
    if (usedIds.has(rec.tmdbId)) continue
    for (const favTitle of rec.matchedFavorites) {
      if (!simToFavsMap.has(favTitle)) {
        simToFavsMap.set(favTitle, { ...rec, group: 'similar-to-favorites', similarToTitle: favTitle })
        usedIds.add(rec.tmdbId)
        break
      }
    }
  }
  // Fill with remaining if needed
  for (const rec of scored) {
    if (usedIds.has(rec.tmdbId)) continue
    if (simToFavsMap.size >= 6) break
    const key = `gen-${rec.tmdbId}`
    simToFavsMap.set(key, { ...rec, group: 'similar-to-favorites' })
    usedIds.add(rec.tmdbId)
  }
  const similarToFavorites = Array.from(simToFavsMap.values()).slice(0, 6)

  // Group 3 — "Expand Your Taste": best scores on user's weakest DNA dimensions
  const sortedDims = [...DNA_KEYS].sort((a, b) => userDNA[a] - userDNA[b])
  const weakestDims = sortedDims.slice(0, 3)

  const expandCandidates: EnrichedRec[] = []
  for (const rec of scored) {
    if (usedIds.has(rec.tmdbId)) continue
    // Reuse the DNA already computed during scoring — no second API/compute call
    const movieVibe = rec._movieDNA
    if (!movieVibe) continue
    // Find which weak dimension this movie scores highly on
    const expandDim = weakestDims.find(d => movieVibe[d] >= 6.5 && userDNA[d] < 5)
    if (expandDim) {
      const traitLabel = DNA_META[expandDim].label
      expandCandidates.push({
        ...rec,
        group:       'expand-your-taste',
        expandTrait: traitLabel,
        explanation: `Scores ${movieVibe[expandDim].toFixed(1)}/10 in ${traitLabel.toLowerCase()} — higher than your usual preference. A great way to broaden your cinematic range.`,
      })
      usedIds.add(rec.tmdbId)
      if (expandCandidates.length >= 6) break
    }
  }
  // If not enough, fill with remaining high-quality candidates
  if (expandCandidates.length < 4) {
    for (const rec of scored) {
      if (usedIds.has(rec.tmdbId)) continue
      if (expandCandidates.length >= 6) break
      expandCandidates.push({ ...rec, group: 'expand-your-taste' })
      usedIds.add(rec.tmdbId)
    }
  }
  const expandYourTaste = expandCandidates.slice(0, 6)

  // Group 3B — "DNA Based Picks": driven purely by user's STRONGEST DNA dimensions
  // Pick movies where the movie's score on the user's top traits is highest —
  // different from "We Think You'd Like" which optimises total DNA distance.
  const sortedDimsDesc = [...DNA_KEYS].sort((a, b) => userDNA[b] - userDNA[a])
  const topDims = sortedDimsDesc.slice(0, 3)  // user's top 3 traits

  const dnaCandidates: EnrichedRec[] = []
  for (const rec of scored) {
    if (usedIds.has(rec.tmdbId)) continue
    const movieVibe = rec._movieDNA
    if (!movieVibe) continue
    // Must score well on at least 2 of the user's top 3 traits
    const traitHits = topDims.filter(d => movieVibe[d] >= 6.0).length
    if (traitHits >= 2) {
      const traitNames = topDims
        .filter(d => movieVibe[d] >= 6.0)
        .map(d => DNA_META[d].label.toLowerCase())
        .slice(0, 2)
      dnaCandidates.push({
        ...rec,
        group:       'dna-based-picks',
        explanation: traitNames.length >= 2
          ? `Scores highly in ${traitNames[0]} and ${traitNames[1]} — your two strongest traits.`
          : `Strongly matches your ${traitNames[0]} preference.`,
      })
      usedIds.add(rec.tmdbId)
      if (dnaCandidates.length >= 8) break
    }
  }
  // Fill if pool was thin
  for (const rec of scored) {
    if (usedIds.has(rec.tmdbId)) continue
    if (dnaCandidates.length >= 6) break
    dnaCandidates.push({ ...rec, group: 'dna-based-picks' })
    usedIds.add(rec.tmdbId)
  }
  const dnaBasedPicks = dnaCandidates.slice(0, 8)

  // Group 4 — "Rediscover Classics": sorted by DNA match
  const rediscoverClassics = scoredClassics
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 8)

  // ── Next Favorite — single top pick above confidence threshold ────────────
  const ALL_RANKED = [...weThinkYoudLike].sort((a, b) => b.matchScore - a.matchScore)
  const nextFavoriteRaw = ALL_RANKED.find(r => r.matchScore >= 82) ?? ALL_RANKED[0] ?? null

  // Top traits for the DNA section header
  const topTraits = sortedDimsDesc.slice(0, 3).map(d => ({
    label: DNA_META[d].label,
    icon:  DNA_META[d].icon,
    score: parseFloat(userDNA[d].toFixed(1)),
  }))

  // Strip internal _movieDNA before returning to client
  function strip(recs: EnrichedRec[]): EnrichedRec[] {
    return recs.map(({ _movieDNA: _, ...r }) => r)
  }
  function stripOne(rec: EnrichedRec | null): EnrichedRec | null {
    if (!rec) return null
    const { _movieDNA: _, ...r } = rec
    return r
  }

  return {
    nextFavorite:       stripOne(nextFavoriteRaw),
    weThinkYoudLike:    strip(weThinkYoudLike),
    similarToFavorites: strip(similarToFavorites),
    dnaBasedPicks:      strip(dnaBasedPicks),
    expandYourTaste:    strip(expandYourTaste),
    rediscoverClassics: strip(rediscoverClassics),
    topTraits,
  }
}

// ─── Scoring function ─────────────────────────────────────────────────────────

function scoreMovie(opts: {
  movie:               TMDbMovie
  sources:             RecommendationAnchor[]
  favorites:           { tmdbId: number; title: string; genreIds: number[] }[]
  userDNA:             DNAScores
  hasTasteProfile:     boolean
  userGenres:          string[]
  ratingGenreAffinity: Map<number, GenreAffinity>
}): EnrichedRec | null {
  const {
    movie, sources, favorites, userDNA, hasTasteProfile, userGenres, ratingGenreAffinity,
  } = opts

  // Compute movie vibe
  const movieDNA = computeMovieVibe({
    id:                movie.id,
    genres:            (movie.genre_ids ?? []).map(id => ({ id, name: '' })),
    runtime:           null,
    vote_average:      movie.vote_average,
    vote_count:        movie.vote_count,
    popularity:        movie.popularity,
    release_date:      movie.release_date,
    original_language: movie.original_language,
  })

  // ── Score components ───────────────────────────────────────────────────────

  // 1. DNA compatibility (0-34). A neutral fallback profile contributes much
  // less, otherwise a new user's generic 5/10 profile looks falsely precise.
  const totalDiff = DNA_KEYS.reduce((sum, k) => sum + Math.abs(movieDNA[k] - userDNA[k]), 0)
  const avgDiff   = totalDiff / DNA_KEYS.length
  const dnaSimilarity = Math.max(0, 100 - (avgDiff / 9) * 100)
  const dnaPts = dnaSimilarity * (hasTasteProfile ? 0.34 : 0.1)

  // 2. Explicit genre preferences (0-14)
  const movieGenreNames = (movie.genre_ids ?? []).map(id => GENRE_ID_TO_NAME[id]?.toLowerCase()).filter(Boolean)
  const matchedGenres   = movieGenreNames.filter(g => userGenres.includes(g))
  const genrePts        = Math.min(14, matchedGenres.length * 7)

  // 3. Quality (0-12), with vote volume as confidence rather than a popularity
  // jackpot. This keeps obscure good films viable without rewarding noise.
  const qualityPts = Math.max(0, Math.min(
    12,
    (movie.vote_average - 5) * 2.4 + Math.min(2.4, Math.log10(movie.vote_count + 1) * 0.7),
  ))

  // 4. Direct evidence from the source pools (0-24)
  const sourceFavorites = sources.filter(source => source.kind === 'favorite')
  const sourceRatings   = sources.filter(source => source.kind === 'rating')
  const sourceLikedPicks = sources.filter(source => source.kind === 'liked-pick')

  let sourcePts = 0
  if (sourceFavorites.length > 0) sourcePts += 10 + Math.min(4, (sourceFavorites.length - 1) * 2)
  if (sourceRatings.length > 0) {
    const strongest = Math.max(...sourceRatings.map(source => source.affinity ?? 0))
    sourcePts += 10 + Math.min(4, strongest * 3) + Math.min(3, (sourceRatings.length - 1) * 1.5)
  }
  if (sourceLikedPicks.length > 0) sourcePts += 11 + Math.min(2, sourceLikedPicks.length - 1)
  const sourceKinds = [sourceFavorites, sourceRatings, sourceLikedPicks].filter(group => group.length > 0).length
  if (sourceKinds > 1) sourcePts += 3
  sourcePts = Math.min(24, sourcePts)

  // Genre overlap is useful supporting context, but it is not treated as proof
  // that two films are truly similar.
  const bestOverlapFavs: string[] = []
  for (const fav of favorites) {
    const overlap = (movie.genre_ids ?? []).filter(g => (fav.genreIds ?? []).includes(g)).length
    if (overlap >= 2) bestOverlapFavs.push(fav.title)
  }
  const allMatchedFavs = [...new Set([
    ...sourceFavorites.map(source => source.title),
    ...bestOverlapFavs,
  ])].slice(0, 3)
  if (sourceFavorites.length === 0 && bestOverlapFavs.length > 0) sourcePts += 3

  // 5. Rating affinity (-16 to +14). Repeated low ratings now actively lower a
  // candidate instead of every genre overlap being treated as positive.
  const affinityResult = scoreGenreAffinity(movie.genre_ids ?? [], ratingGenreAffinity)
  const ratingPts = affinityResult.points
  const ratingInsight = affinityResult.strongestPositive
    ? (() => {
        const [genreId, affinity] = affinityResult.strongestPositive!
        const noun = affinity.count === 1 ? 'rating' : 'ratings'
        return `You average ${Math.round(affinity.averageScore)}/100 on ${GENRE_ID_TO_NAME[genreId] ?? 'similar'} films across ${affinity.count} ${noun}`
      })()
    : null

  const totalScore = Math.max(0, Math.min(98, Math.round(
    dnaPts + genrePts + qualityPts + sourcePts + ratingPts,
  )))

  const matchedRatings: MatchedRating[] = sourceRatings
    .filter((source): source is RecommendationAnchor & { score: number } => typeof source.score === 'number')
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(source => ({ title: source.title, score: source.score }))
  const matchedLikedPicks = sourceLikedPicks.map(source => source.title).slice(0, 2)

  // ── Matched traits ─────────────────────────────────────────────────────────
  const matchedTraits: MatchedTrait[] = DNA_KEYS
    .filter(k => movieDNA[k] >= 6.5 && Math.abs(movieDNA[k] - userDNA[k]) < 2.5)
    .sort((a, b) => movieDNA[b] - movieDNA[a])
    .slice(0, 4)
    .map(k => ({
      trait:      DNA_META[k].label,
      icon:       DNA_META[k].icon,
      yourScore:  parseFloat(userDNA[k].toFixed(1)),
      movieScore: parseFloat(movieDNA[k].toFixed(1)),
    }))

  // ── Explanation ────────────────────────────────────────────────────────────
  let explanation: string
  if (matchedRatings.length > 0) {
    const anchor = matchedRatings[0]
    const trait = matchedTraits[0]?.trait.toLowerCase()
    explanation = trait
      ? `Because you rated ${anchor.title} ${anchor.score}/100, this ${trait}-forward pick should feel familiar without being a repeat.`
      : `Because you rated ${anchor.title} ${anchor.score}/100, this is one of the strongest related matches for your taste.`
  } else if (matchedLikedPicks.length > 0) {
    explanation = `You liked our ${matchedLikedPicks[0]} recommendation, and this follows a closely related taste signal.`
  } else if (allMatchedFavs.length > 0) {
    const fav = allMatchedFavs[0]
    const trait = matchedTraits[0]?.trait
    explanation = trait
      ? `If you loved ${fav}, this also lines up with your ${trait.toLowerCase()} preference.`
      : `If you enjoyed ${fav}, this is a strong related pick for your broader taste.`
  } else if (matchedTraits.length > 0) {
    const traits = matchedTraits.slice(0, 2).map(t => t.trait.toLowerCase()).join(' and ')
    explanation = `Matches your DNA profile in ${traits}.`
  } else if (matchedGenres.length > 0) {
    explanation = `A strong ${matchedGenres[0]} film that fits your taste.`
  } else {
    explanation = 'Aligns well with your overall cinematic DNA.'
  }

  return {
    tmdbId:           movie.id,
    title:            movie.title,
    posterPath:       movie.poster_path,
    releaseDate:      movie.release_date,
    voteAverage:      movie.vote_average,
    genreIds:         movie.genre_ids ?? [],
    matchScore:       totalScore,
    group:            'we-think-youd-like',
    explanation,
    matchedFavorites: allMatchedFavs,
    matchedRatings,
    matchedLikedPicks,
    matchedGenres:    matchedGenres.map(g => g.charAt(0).toUpperCase() + g.slice(1)),
    matchedTraits,
    ratingInsight,
    _movieDNA:        movieDNA,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function empty(): CuratedRecGroups {
  return {
    nextFavorite:       null,
    weThinkYoudLike:    [],
    similarToFavorites: [],
    dnaBasedPicks:      [],
    expandYourTaste:    [],
    rediscoverClassics: [],
    topTraits:          [],
  }
}

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
