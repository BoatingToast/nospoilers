import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-ignore explicit TypeScript extension is intentional for node:test
import { selectAutomaticMovieMatch } from '../lib/movie-matching.ts'

const candidates = [
  { id: 1, title: 'The Example', release_date: '1999-03-01', popularity: 20 },
  { id: 2, title: 'The Example', release_date: '2024-08-12', popularity: 80 },
  { id: 3, title: 'Another Movie', release_date: '2024-01-01', popularity: 100 },
]

test('matches an exact title automatically and uses popularity to break ties', () => {
  assert.equal(selectAutomaticMovieMatch('The Example', null, candidates)?.id, 2)
})

test('uses release year to disambiguate remakes', () => {
  assert.equal(selectAutomaticMovieMatch('The Example', 1999, candidates)?.id, 1)
})

test('normalizes punctuation, accents, and ampersands', () => {
  const result = selectAutomaticMovieMatch('Amélie & Me', 2020, [
    { id: 4, title: 'Amelie and Me', release_date: '2020-04-03' },
  ])
  assert.equal(result?.id, 4)
})

test('does not force a match when the supplied year disagrees', () => {
  assert.equal(selectAutomaticMovieMatch('The Example', 2012, candidates), null)
})

test('does not fuzzy-match a different title', () => {
  assert.equal(selectAutomaticMovieMatch('Example', null, candidates), null)
})
