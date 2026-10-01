import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { curateDistinctMovieShelf, selectRelatedMovies } from '../lib/movie-quality.ts'
import type { TMDbMovie, TMDbMovieDetail } from '../types'

const NOW = new Date('2026-08-24T12:00:00Z')

function movie(id: number, overrides: Partial<TMDbMovie> = {}): TMDbMovie {
  return {
    id,
    title: `Movie ${id}`,
    overview: '',
    poster_path: `/poster-${id}.jpg`,
    backdrop_path: null,
    release_date: '2020-01-01',
    vote_average: 7.2,
    vote_count: 500,
    genre_ids: [18],
    popularity: 20,
    original_language: 'en',
    ...overrides,
  }
}

function detail(overrides: Partial<TMDbMovieDetail> = {}): TMDbMovieDetail {
  return {
    ...movie(100),
    runtime: 120,
    genres: [{ id: 18, name: 'Drama' }, { id: 36, name: 'History' }],
    tagline: null,
    status: 'Released',
    budget: 0,
    revenue: 0,
    production_companies: [],
    ...overrides,
  }
}

test('curates globally distinct shelves and rejects low-signal entries', () => {
  const seen = new Set<number>()
  const first = curateDistinctMovieShelf([
    movie(1),
    movie(2, { poster_path: null }),
    movie(3, { release_date: '2027-01-01' }),
    movie(4, { vote_count: 10 }),
  ], seen, { minVoteCount: 100, now: NOW })
  const second = curateDistinctMovieShelf([movie(1), movie(5)], seen, { minVoteCount: 100, now: NOW })

  assert.deepEqual(first.map(item => item.id), [1])
  assert.deepEqual(second.map(item => item.id), [5])
})

test('related selection blends sources, removes noise, and explains relevance', () => {
  const result = selectRelatedMovies(
    detail(),
    [
      movie(1, { genre_ids: [18, 36], vote_count: 2_000 }),
      movie(2, { genre_ids: [35], vote_count: 50_000, vote_average: 9 }),
    ],
    [
      movie(1, { genre_ids: [18, 36], vote_count: 2_000 }),
      movie(3, { genre_ids: [18], vote_count: 800 }),
      movie(4, { genre_ids: [18], vote_count: 20 }),
    ],
    { now: NOW },
  )

  assert.deepEqual(result.map(item => item.movie.id), [1, 3])
  assert.match(result[0].reason, /Drama/)
  assert.doesNotMatch(result.map(item => item.movie.id).join(','), /2|4/)
})
