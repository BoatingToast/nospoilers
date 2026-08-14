import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { decideMovieNightOutcome } from '../lib/movie-night-outcome.ts'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { checkRateLimit, requestClientKey } from '../lib/rate-limit.ts'

function candidate(
  id: string,
  votes: Array<'watch' | 'maybe' | 'pass'>,
  groupFit = 80,
  position = 0,
) {
  return { id, groupFit, position, votes: votes.map(value => ({ value })) }
}

test('does not resolve a ballot before at least two participants join', () => {
  assert.equal(decideMovieNightOutcome([
    candidate('movie-1', ['watch']),
  ], 1), null)
})

test('resolves the first unanimous Watch before every candidate is complete', () => {
  assert.deepEqual(decideMovieNightOutcome([
    candidate('movie-1', ['watch', 'watch', 'watch']),
    candidate('movie-2', ['maybe']),
  ], 3), {
    status: 'matched',
    matchedCandidateId: 'movie-1',
  })
})

test('waits while any participant still has an unfinished ballot', () => {
  assert.equal(decideMovieNightOutcome([
    candidate('movie-1', ['watch', 'maybe']),
    candidate('movie-2', ['pass']),
  ], 2), null)
})

test('returns no match instead of forcing a winner after an all-Pass ballot', () => {
  assert.deepEqual(decideMovieNightOutcome([
    candidate('movie-1', ['pass', 'pass']),
    candidate('movie-2', ['pass', 'pass']),
  ], 2), {
    status: 'no_match',
    matchedCandidateId: null,
  })
})

test('uses Watch and Maybe votes for a completed consensus result', () => {
  assert.deepEqual(decideMovieNightOutcome([
    candidate('movie-1', ['watch', 'pass'], 95, 0),
    candidate('movie-2', ['watch', 'maybe'], 70, 1),
  ], 2), {
    status: 'matched',
    matchedCandidateId: 'movie-2',
  })
})

test('throttles repeated Movie Night requests within the configured window', () => {
  const key = `movie-night-test-${Date.now()}-${Math.random()}`
  assert.equal(checkRateLimit(key, 2, 60_000).allowed, true)
  assert.equal(checkRateLimit(key, 2, 60_000).allowed, true)
  assert.equal(checkRateLimit(key, 2, 60_000).allowed, false)
})

test('uses the first forwarded address as the request client key', () => {
  const request = new Request('https://example.test', {
    headers: { 'x-forwarded-for': '203.0.113.4, 10.0.0.2' },
  })
  assert.equal(requestClientKey(request), '203.0.113.4')
})
