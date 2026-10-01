import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { selectMovieTrailers } from '../lib/movie-trailers.ts'
import type { TMDbVideo } from '../types'

function video(overrides: Partial<TMDbVideo>): TMDbVideo {
  return {
    id: overrides.key ?? 'video-id',
    iso_639_1: 'en',
    iso_3166_1: 'US',
    key: 'abcdefghijk',
    name: 'Trailer',
    official: false,
    published_at: '2026-01-01T00:00:00.000Z',
    site: 'YouTube',
    size: 1080,
    type: 'Trailer',
    ...overrides,
  }
}

test('keeps playable YouTube trailers and teasers only', () => {
  const result = selectMovieTrailers([
    video({ key: 'trailer0001', type: 'Trailer' }),
    video({ key: 'teaser00001', type: 'Teaser' }),
    video({ key: 'clip0000001', type: 'Clip' }),
    video({ key: 'vimeo000001', site: 'Vimeo' }),
    video({ key: '<unsafe>' }),
  ])

  assert.deepEqual(result.map(item => item.key), ['trailer0001', 'teaser00001'])
})

test('prioritizes official trailers and removes duplicate video keys', () => {
  const result = selectMovieTrailers([
    video({ id: 'teaser', key: 'teaser00001', type: 'Teaser', official: true }),
    video({ id: 'trailer', key: 'trailer0001', type: 'Trailer', official: true }),
    video({ id: 'duplicate', key: 'trailer0001', type: 'Trailer' }),
  ])

  assert.deepEqual(result.map(item => item.id), ['trailer', 'teaser'])
})
