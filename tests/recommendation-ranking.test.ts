import assert from 'node:assert/strict'
import test from 'node:test'
// Node 22 runs this erasable TypeScript test directly.
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { buildGenreAffinities, pickDiverseRecommendations, scoreGenreAffinity, selectPositiveRatingAnchors } from '../services/recommendation-ranking.ts'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { loadRecommendationRatingRows } from '../services/recommendation-rating-evidence.ts'

test('genre affinities use actual rating metadata and penalize repeated dislikes', () => {
  const affinities = buildGenreAffinities([
    { score: 95, genreIds: [18, 9648] },
    { score: 91, genreIds: [18] },
    { score: 22, genreIds: [28] },
    { score: 30, genreIds: [28, 878] },
  ])

  assert.ok(scoreGenreAffinity([18], affinities).points > 0)
  assert.ok(scoreGenreAffinity([28], affinities).points < 0)
  assert.equal(scoreGenreAffinity([35], affinities).points, 0)
})

test('rating anchors adapt to the user rating scale', () => {
  const anchors = selectPositiveRatingAnchors([
    { tmdbId: 1, title: 'Loved', score: 76, genreIds: [18] },
    { tmdbId: 2, title: 'Average', score: 52, genreIds: [18] },
    { tmdbId: 3, title: 'Disliked', score: 35, genreIds: [28] },
    { tmdbId: 4, title: 'Also loved', score: 72, genreIds: [9648] },
    { tmdbId: 5, title: 'Low', score: 41, genreIds: [35] },
  ], 3)

  assert.deepEqual(anchors.map(anchor => anchor.tmdbId), [1, 4])
})

test('diversity reranking breaks up near-identical results without hiding the best match', () => {
  const ranked = pickDiverseRecommendations([
    { tmdbId: 1, matchScore: 90, genreIds: [28, 12] },
    { tmdbId: 2, matchScore: 89, genreIds: [28, 12] },
    { tmdbId: 3, matchScore: 87, genreIds: [18] },
  ], 3)

  assert.deepEqual(ranked.map(movie => movie.tmdbId), [1, 3, 2])
})

test('rating evidence falls back to legacy rows while the genre column migration rolls out', async () => {
  let legacyQueryCalled = false

  const rows = await loadRecommendationRatingRows(
    async () => { throw { code: 'P2022' } },
    async () => {
      legacyQueryCalled = true
      return [{ tmdbId: 1, title: 'Legacy favorite', score: 92 }]
    },
  )

  assert.equal(legacyQueryCalled, true)
  assert.deepEqual(rows, [
    { tmdbId: 1, title: 'Legacy favorite', score: 92, genreIds: [] },
  ])
})

test('rating evidence does not hide unrelated database failures', async () => {
  let legacyQueryCalled = false

  await assert.rejects(
    loadRecommendationRatingRows(
      async () => { throw { code: 'P1001' } },
      async () => {
        legacyQueryCalled = true
        return []
      },
    ),
    (error: unknown) => Boolean(
      error && typeof error === 'object' && 'code' in error && error.code === 'P1001',
    ),
  )

  assert.equal(legacyQueryCalled, false)
})
