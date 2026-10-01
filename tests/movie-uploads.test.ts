import assert from 'node:assert/strict'
import test from 'node:test'
// Node 22 runs this erasable TypeScript test directly. The .ts suffix is
// required at runtime even though the app bundler normally omits it.
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { hasValidMovieSignature, isMovieWatchRegion, MAX_MOVIE_WATCH_PROVIDERS, mergeMovieWatchProviders, normalizeMovieWatchProviders } from '../lib/movie-uploads.ts'

test('keeps multiple watch providers for one movie in their entered order', () => {
  const result = normalizeMovieWatchProviders([
    { name: 'Netflix', url: 'https://netflix.com/title/example' },
    { name: 'Hulu', url: 'https://hulu.com/movie/example' },
    { name: 'HBO Max', url: 'https://hbomax.com/movies/example' },
  ])

  assert.equal(result.error, null)
  assert.deepEqual(result.providers.map(provider => provider.name), ['Netflix', 'Hulu', 'HBO Max'])
})

test('watch providers are optional and blank rows are ignored', () => {
  assert.deepEqual(normalizeMovieWatchProviders(undefined), { providers: [], error: null })
  assert.deepEqual(
    normalizeMovieWatchProviders([{ name: ' ', url: '' }]),
    { providers: [], error: null },
  )
})

test('rejects incomplete or unsafe provider links', () => {
  assert.match(
    normalizeMovieWatchProviders([{ name: 'Netflix', url: '' }]).error ?? '',
    /both a platform name and watch link/i,
  )
  assert.match(
    normalizeMovieWatchProviders([{ name: 'Bad link', url: 'javascript:alert(1)' }]).error ?? '',
    /http:\/\/ or https:\/\//i,
  )
})

test('deduplicates identical providers and enforces the provider limit', () => {
  const duplicate = { name: 'Netflix', url: 'https://netflix.com/title/example' }
  const secondNetflixLink = { name: 'netflix', url: 'https://netflix.com/title/another' }
  assert.equal(normalizeMovieWatchProviders([duplicate, secondNetflixLink]).providers.length, 1)

  const tooMany = Array.from({ length: MAX_MOVIE_WATCH_PROVIDERS + 1 }, (_, index) => ({
    name: `Service ${index}`,
    url: `https://example.com/watch/${index}`,
  }))
  assert.match(normalizeMovieWatchProviders(tooMany).error ?? '', /no more than/i)
})

test('accepts ISO-style two-letter watch regions', () => {
  assert.equal(isMovieWatchRegion('US'), true)
  assert.equal(isMovieWatchRegion('GB'), true)
  assert.equal(isMovieWatchRegion('usa'), false)
})

test('creator links override automatic providers with the same name', () => {
  const automatic = [
    { name: 'Netflix', url: 'https://www.themoviedb.org/movie/1/watch', source: 'tmdb' as const },
    { name: 'Hulu', url: 'https://www.themoviedb.org/movie/1/watch', source: 'tmdb' as const },
  ]
  const creator = [
    { name: 'netflix', url: 'https://netflix.com/title/1', source: 'creator' as const },
  ]

  const merged = mergeMovieWatchProviders(automatic, creator)
  assert.equal(merged.length, 2)
  assert.equal(merged[0].source, 'creator')
  assert.equal(merged[0].url, 'https://netflix.com/title/1')
  assert.equal(merged[1].name, 'Hulu')
})

test('checks movie container signatures instead of trusting the file name', () => {
  const mp4 = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])
  const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81])
  const executable = new Uint8Array([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0])

  assert.equal(hasValidMovieSignature(mp4, 'video/mp4'), true)
  assert.equal(hasValidMovieSignature(mp4, 'video/quicktime'), true)
  assert.equal(hasValidMovieSignature(webm, 'video/webm'), true)
  assert.equal(hasValidMovieSignature(executable, 'video/mp4'), false)
  assert.equal(hasValidMovieSignature(webm, 'application/octet-stream'), false)
})
