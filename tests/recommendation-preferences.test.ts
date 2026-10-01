import assert from 'node:assert/strict'
import test from 'node:test'
// Node's strip-types runner requires the extension at runtime.
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { buildRecommendationPreferenceProfile, isCandidateAllowed, preferenceScoreAdjustment, type PreferenceCandidate, type TastePreferenceValues } from '../lib/recommendation-preferences.ts'

function values(overrides: Partial<TastePreferenceValues> = {}): TastePreferenceValues {
  return {
    pacingScale: null,
    endingClosure: null,
    storytellingScale: null,
    toneScale: null,
    complexity: 5,
    plotTwists: 5,
    escapism: null,
    emotionalIntensity: null,
    eraOpenness: null,
    runtimePreference: null,
    popularityPreference: null,
    discoveryPreference: null,
    subtitleOpenness: null,
    violenceTolerance: null,
    horrorTolerance: null,
    animationOpenness: null,
    documentaryOpenness: null,
    excludedGenres: [],
    ...overrides,
  }
}

function movie(overrides: Partial<PreferenceCandidate> = {}): PreferenceCandidate {
  return {
    genre_ids: [18],
    release_date: '2020-01-01',
    original_language: 'en',
    popularity: 60,
    ...overrides,
  }
}

test('general recommendations reject classics without classic-taste evidence', () => {
  const profile = buildRecommendationPreferenceProfile(values(), [2012, 2017, 2019, 2022, 2024])

  assert.equal(isCandidateAllowed(movie({ release_date: '1939-12-15' }), profile), false)
  assert.equal(isCandidateAllowed(movie({ release_date: '1998-06-01' }), profile), true)
})

test('classic evidence or explicit openness permits older films', () => {
  const observedClassicTaste = buildRecommendationPreferenceProfile(
    values(),
    [1939, 1948, 2005, 2018, 2022],
  )
  const explicitClassicTaste = buildRecommendationPreferenceProfile(
    values({ eraOpenness: 10 }),
    [2018, 2020, 2024],
  )
  const classic = movie({ release_date: '1939-12-15' })

  assert.equal(isCandidateAllowed(classic, observedClassicTaste), true)
  assert.equal(isCandidateAllowed(classic, explicitClassicTaste), true)
})

test('the dedicated classics shelf bypasses only the general era gate', () => {
  const profile = buildRecommendationPreferenceProfile(values({ excludedGenres: ['horror'] }), [2020, 2022])

  assert.equal(
    isCandidateAllowed(movie({ release_date: '1940-01-01' }), profile, { allowClassics: true }),
    true,
  )
  assert.equal(
    isCandidateAllowed(movie({ release_date: '1940-01-01', genre_ids: [27] }), profile, { allowClassics: true }),
    false,
  )
})

test('language and format guardrails are enforced', () => {
  const profile = buildRecommendationPreferenceProfile(values({
    subtitleOpenness: 1,
    animationOpenness: 1,
    documentaryOpenness: 1,
    horrorTolerance: 1,
  }), [2020])

  assert.equal(isCandidateAllowed(movie({ original_language: 'ko' }), profile), false)
  assert.equal(isCandidateAllowed(movie({ genre_ids: [16] }), profile), false)
  assert.equal(isCandidateAllowed(movie({ genre_ids: [99] }), profile), false)
  assert.equal(isCandidateAllowed(movie({ genre_ids: [27] }), profile), false)
})

test('runtime preference and tonight mood rerank otherwise equal candidates', () => {
  const shortProfile = buildRecommendationPreferenceProfile(values({ runtimePreference: 1 }), [2020])
  const shortMovie = movie({ runtime: 88 })
  const longMovie = movie({ runtime: 185 })
  const shortMood = { intensity: 5, runtime: 1, adventure: 5 }

  assert.ok(
    preferenceScoreAdjustment(shortMovie, shortProfile, { mood: shortMood }) >
    preferenceScoreAdjustment(longMovie, shortProfile, { mood: shortMood }),
  )
})
