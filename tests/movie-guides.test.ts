import assert from 'node:assert/strict'
import test from 'node:test'
import {
  GUIDE_LIST_SIZE,
  MOVIE_GUIDES,
  getGuideForGenre,
  getMovieGuide,
  guidePath,
  selectGuideMovies,
  // @ts-expect-error explicit TypeScript extension is intentional for node:test
} from '../lib/movie-guides.ts'

const TODAY = '2026-11-27'
const BRAND_SUFFIX = ' | NoSpoilers'

function uniqueValues(values: string[]) {
  return new Set(values).size === values.length
}

test('guides have unique, URL-safe slugs and resolve by slug', () => {
  const slugs = MOVIE_GUIDES.map(guide => guide.slug)
  assert.ok(uniqueValues(slugs))
  for (const guide of MOVIE_GUIDES) {
    assert.match(guide.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, guide.slug)
    assert.equal(getMovieGuide(guide.slug), guide)
    assert.equal(guidePath(guide), `/movie-recommendations/${guide.slug}`)
  }
  assert.equal(getMovieGuide('not-a-guide'), undefined)
})

// Near-duplicate pages are what Google's scaled content policy targets.
test('every guide has its own title, heading, description, and copy', () => {
  for (const field of ['title', 'heading', 'description', 'label', 'method', 'spoilerTip'] as const) {
    assert.ok(uniqueValues(MOVIE_GUIDES.map(guide => guide[field])), `duplicate ${field}`)
  }
  const paragraphs = MOVIE_GUIDES.flatMap(guide => guide.intro)
  assert.ok(uniqueValues(paragraphs), 'duplicate intro paragraph')
  const questions = MOVIE_GUIDES.flatMap(guide => guide.questions.map(item => item.question))
  assert.ok(uniqueValues(questions), 'duplicate question')
})

test('search snippets fit in results without truncation', () => {
  for (const guide of MOVIE_GUIDES) {
    assert.ok((guide.title + BRAND_SUFFIX).length <= 65, `${guide.slug} title is too long`)
    assert.ok(guide.description.length >= 110 && guide.description.length <= 160,
      `${guide.slug} description is ${guide.description.length} characters`)
    assert.ok(guide.questions.length >= 2, `${guide.slug} needs questions`)
  }
})

test('related guides exist and never point back to the same guide', () => {
  for (const guide of MOVIE_GUIDES) {
    assert.ok(guide.related.length >= 3, guide.slug)
    assert.ok(uniqueValues(guide.related), guide.slug)
    for (const slug of guide.related) {
      assert.ok(getMovieGuide(slug), `${guide.slug} links to missing guide ${slug}`)
      assert.notEqual(slug, guide.slug)
    }
  }
})

test('each TMDb genre links to at most one guide', () => {
  const genreIds = MOVIE_GUIDES.flatMap(guide => guide.genreId === undefined ? [] : [guide.genreId])
  assert.ok(uniqueValues(genreIds.map(String)))
  assert.equal(getGuideForGenre(878)?.slug, 'best-sci-fi-movies')
  assert.equal(getGuideForGenre(10749), undefined)
})

test('queries exclude adult titles and unreleased films', () => {
  for (const guide of MOVIE_GUIDES) {
    const query = guide.query(TODAY)
    assert.equal(query.include_adult, 'false', guide.slug)
    assert.equal(query['primary_release_date.lte'], TODAY, guide.slug)
    assert.ok(Number(query['vote_count.gte']) >= 40, `${guide.slug} needs a vote floor`)
  }
  assert.equal(getMovieGuide('new-movies')?.query(TODAY)['primary_release_date.gte'], '2026-08-29')
})

// The page shows how each list is chosen. It must describe the real query.
test('the published method matches the query vote floor and genres', () => {
  for (const guide of MOVIE_GUIDES) {
    const query = guide.query(TODAY)
    const votes = Number(query['vote_count.gte']).toLocaleString('en-US')
    assert.ok(guide.method.includes(votes), `${guide.slug} method should mention ${votes} votes`)
    if (query.without_genres === '16') assert.match(guide.method, /live-action/, guide.slug)
    if (guide.genreId !== undefined) assert.ok(query.with_genres?.split(/[,|]/).includes(String(guide.genreId)), guide.slug)
  }
})

test('guide lists drop adult, unreleased, undated, and duplicate titles, then cap the list', () => {
  const movie = (id: number, extra: Record<string, unknown> = {}) => ({
    id,
    title: `Film ${id}`,
    overview: '',
    poster_path: null,
    backdrop_path: null,
    release_date: '2020-01-01',
    vote_average: 8,
    vote_count: 5000,
    genre_ids: [18],
    popularity: 10,
    original_language: 'en',
    ...extra,
  })
  const now = new Date(`${TODAY}T12:00:00Z`)
  const selected = selectGuideMovies([
    movie(1),
    movie(1),
    movie(2, { adult: true }),
    movie(3, { release_date: '2027-01-01' }),
    movie(4, { release_date: '' }),
    movie(5, { title: '  ' }),
    movie(6, { id: 0 }),
    movie(7, { release_date: TODAY }),
  ], now)
  assert.deepEqual(selected.map(item => item.id), [1, 7])

  const many = Array.from({ length: GUIDE_LIST_SIZE + 5 }, (_, index) => movie(index + 1))
  assert.equal(selectGuideMovies(many, now).length, GUIDE_LIST_SIZE)
})
