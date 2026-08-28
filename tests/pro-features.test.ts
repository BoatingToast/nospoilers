import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { buildProDoubleFeatures, buildProTasteReport, rankProTonight } from '../lib/pro-features.ts'

function queueMovie(overrides: Record<string, unknown> = {}) {
  return {
    tmdbId: 1,
    title: 'Test Film',
    posterPath: null,
    releaseDate: '2024-01-01',
    genreIds: [18],
    runtime: 110,
    voteAverage: 7.5,
    matchScore: 75,
    addedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function rating(overrides: Record<string, unknown> = {}) {
  return {
    score: 80,
    genreIds: [18],
    storytelling: null,
    characters: null,
    entertainment: null,
    emotion: null,
    complexity: null,
    suspense: null,
    ...overrides,
  }
}

test('Tonight Mode respects a hard short-night constraint', () => {
  const result = rankProTonight([
    queueMovie({ tmdbId: 1, title: 'Short Film', runtime: 92, matchScore: 74, genreIds: [53] }),
    queueMovie({ tmdbId: 2, title: 'Long Film', runtime: 178, matchScore: 84, genreIds: [53] }),
  ], { time: 'quick', mood: 'gripping', company: 'solo' })

  assert.equal(result[0].title, 'Short Film')
  assert.match(result[0].reasons[0], /fits your short-night limit/)
})

test('Tonight Mode changes its first pick when the mood changes', () => {
  const movies = [
    queueMovie({ tmdbId: 1, title: 'Warm Comedy', genreIds: [35, 10749] }),
    queueMovie({ tmdbId: 2, title: 'Tight Thriller', genreIds: [53, 9648] }),
  ]

  const comfort = rankProTonight(movies, { time: 'standard', mood: 'comfort', company: 'solo' })
  const gripping = rankProTonight(movies, { time: 'standard', mood: 'gripping', company: 'solo' })

  assert.equal(comfort[0].title, 'Warm Comedy')
  assert.equal(gripping[0].title, 'Tight Thriller')
})

test('Double-Feature Builder enforces the selected total runtime', () => {
  const pairs = buildProDoubleFeatures([
    queueMovie({ tmdbId: 1, title: 'Film A', runtime: 95, genreIds: [35] }),
    queueMovie({ tmdbId: 2, title: 'Film B', runtime: 105, genreIds: [18] }),
    queueMovie({ tmdbId: 3, title: 'Film C', runtime: 150, genreIds: [53] }),
  ], 'contrast', 210)

  assert.equal(pairs.length, 1)
  assert.equal(pairs[0].totalRuntime, 200)
  assert.deepEqual([pairs[0].first.title, pairs[0].second.title], ['Film A', 'Film B'])
})

test('Taste Lab reports reliable lanes, evidence counts, and blind spots', () => {
  const report = buildProTasteReport([
    rating({ score: 90, genreIds: [878, 18], storytelling: 9, characters: 7 }),
    rating({ score: 80, genreIds: [878], storytelling: 8, characters: 6 }),
    rating({ score: 96, genreIds: [35], storytelling: 7, characters: 7 }),
  ], ['Sci-Fi', 'Horror'])

  assert.deepEqual(report.strongestLane, { genre: 'Sci-Fi', averageScore: 85, count: 2 })
  assert.equal(report.blindSpot, 'Horror')
  assert.deepEqual(report.topDimension, { label: 'Storytelling', average: 8, count: 3 })
  assert.match(report.nextSignal, /Rate 2 more films/)
})
