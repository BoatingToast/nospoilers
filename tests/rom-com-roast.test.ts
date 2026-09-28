import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { buildRomComRoast, isRomComMovie } from '../lib/rom-com-roast.ts'

const balancedDNA = {
  suspenseScore: 5,
  emotionalImpactScore: 7,
  complexityScore: 5,
  humorScore: 8,
  realismScore: 4,
  actionScore: 3,
  darknessScore: 3,
}

test('only enables the feature for movies tagged Romance and Comedy', () => {
  assert.equal(isRomComMovie([35, 10749]), true)
  assert.equal(isRomComMovie([35]), false)
  assert.equal(isRomComMovie([10749, 18]), false)
})

test('identical profiles produce a 100% rom-com DNA match', () => {
  const result = buildRomComRoast({
    tmdbId: 1,
    title: 'Test Romance',
    genreIds: [35, 10749],
    userDNA: balancedDNA,
    movieDNA: balancedDNA,
  })

  assert.equal(result.matchScore, 100)
  assert.match(result.verdict, /Test Romance/)
})

test('a person gets a stable roast for the same movie', () => {
  const input = {
    tmdbId: 9919,
    title: 'How to Lose a Guy in 10 Days',
    genreIds: [35, 10749],
    releaseDate: '2003-02-07',
    userDNA: balancedDNA,
    movieDNA: { ...balancedDNA, realismScore: 2 },
  }

  assert.deepEqual(buildRomComRoast(input), buildRomComRoast(input))
})

test('the two title examples use separate movie-specific punchline banks', () => {
  const first = buildRomComRoast({
    tmdbId: 4951,
    title: '10 Things I Hate About You',
    genreIds: [35, 10749],
    userDNA: balancedDNA,
    movieDNA: { ...balancedDNA, humorScore: 7 },
  })
  const second = buildRomComRoast({
    tmdbId: 9919,
    title: 'How to Lose a Guy in 10 Days',
    genreIds: [35, 10749],
    userDNA: balancedDNA,
    movieDNA: { ...balancedDNA, realismScore: 2 },
  })

  assert.notEqual(first.roast, second.roast)
  assert.match(first.roast, /mean|insult|annoyance|banter/i)
  assert.match(second.roast, /fraud|terrible decisions|identity|montage/i)
})

test('rejects non-rom-com movies instead of inventing a result', () => {
  assert.throws(() => buildRomComRoast({
    tmdbId: 2,
    title: 'Just a Drama',
    genreIds: [18, 10749],
    userDNA: balancedDNA,
    movieDNA: balancedDNA,
  }), /Rom-Com DNA roasts require/)
})
