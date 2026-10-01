import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { movieSearchDescription, parseCatalogId, serializeJsonLd } from '../lib/seo.ts'

test('catalog IDs reject partial parses, exponent notation, and unsafe numbers', () => {
  for (const value of ['603junk', '6.03', '6e3', '-603', '0', 'Infinity', '9007199254740992', ' 603', '']) {
    assert.equal(parseCatalogId(value), null, value)
  }
  assert.equal(parseCatalogId('603'), 603)
  assert.equal(parseCatalogId('00603'), 603)
})

test('JSON-LD cannot close its script tag when a catalog title contains HTML', () => {
  const data = { name: '</script><script>alert("spoiler")</script>', description: 'A < B & C' }
  const serialized = serializeJsonLd(data)
  assert.ok(!serialized.includes('<'))
  assert.deepEqual(JSON.parse(serialized), data)
})

test('movie search snippets never use plot summaries or taglines', () => {
  const movie = {
    title: 'A Quiet Film',
    release_date: '2026-09-01',
    genres: [{ name: 'Drama' }],
    overview: 'In the end the detective discovers the secret identity.',
    tagline: 'The killer is her brother.',
  }
  const description = movieSearchDescription(movie)
  assert.match(description, /A Quiet Film \(2026\)/)
  assert.match(description, /drama/)
  assert.doesNotMatch(description, /detective|secret identity|killer|brother/)
  assert.doesNotMatch(movieSearchDescription({ ...movie, release_date: '', genres: [] }), /undefined|null|\(\)/)
})
