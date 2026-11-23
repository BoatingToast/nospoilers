import { test } from 'node:test'
import assert from 'node:assert/strict'
// @ts-expect-error Explicit TypeScript extension is intentional for node:test.
import { hasAdminAccess, isAdminEmail } from '../lib/admin-access.ts'
import {
  assertDatasetRecord,
  AUDIENCE_CONSENT_VERSION,
  calculateFit,
  compareVariants,
  csvCell,
  datasetSplit,
  DEFAULT_FACETS,
  parseEnrollment,
  parseEvent,
  parseFeedback,
  parseStudy,
  rateInterval,
  requireSameOrigin,
  // @ts-expect-error Explicit TypeScript extension is intentional for node:test.
} from '../lib/audience-engine.ts'
// @ts-expect-error Explicit TypeScript extension is intentional for node:test.
import { collectionPriorities } from '../lib/audience-insights.ts'

const study = {
  workKey: 'first-light-2026',
  title: 'First light',
  description: 'Preview an original film.',
  mediaType: 'film',
  rightsNote: 'Original work; research permission granted.',
  rightsConfirmed: true,
  discoverable: false,
  targetFacets: DEFAULT_FACETS,
  variants: [
    { label: 'A', headline: 'A quiet journey.', concept: 'An approved preview.', uploadId: '' },
  ],
}

test('administration requires an explicit grant and the exact reserved address', () => {
  assert.equal(hasAdminAccess({ email: 'emoon0108@gmail.com', isAdmin: true }), true)
  assert.equal(hasAdminAccess({ email: 'noahkaplan721@gmail.com', isAdmin: true }), false)
  assert.equal(hasAdminAccess({ email: 'emoon0108@gmail.com', isAdmin: false }), false)
  assert.equal(hasAdminAccess({ email: 'emoon0108+other@gmail.com', isAdmin: true }), false)
  assert.equal(isAdminEmail(' EMOON0108@gmail.com '), true)
  assert.equal(hasAdminAccess(null), false)
})

test('study ingestion requires rights, supported media and usable unique previews', () => {
  assert.equal(parseStudy(study).variants[0].uploadId, null)
  assert.throws(() => parseStudy({ ...study, rightsConfirmed: false }))
  assert.throws(() => parseStudy({ ...study, variants: [{ ...study.variants[0], concept: '' }] }))
  assert.throws(() => parseStudy({ ...study, variants: [...study.variants, ...study.variants] }))
  assert.throws(() => parseStudy({ ...study, targetFacets: { ...DEFAULT_FACETS, humor: 11 } }))
})

test('study consent cannot silently enable model-dataset reuse', () => {
  const enrollment = {
    consent: true,
    reuseConsent: false,
    facets: DEFAULT_FACETS,
    primaryInterest: 'ideas',
    source: 'arbitrary data',
  }
  assert.equal(parseEnrollment(enrollment).reuseConsent, false)
  assert.equal(parseEnrollment(enrollment).source, 'invite')
  assert.throws(() => parseEnrollment({ ...enrollment, consent: false }))
  assert.throws(() => parseEnrollment({ ...enrollment, reuseConsent: undefined }))
})

test('event ingestion drops arbitrary payloads and rejects invalid progress', () => {
  assert.deepEqual(
    parseEvent({
      eventKey: 'event-123456',
      type: 'progress',
      progress: 40,
      userId: 'other-user',
      admin: true,
    }),
    { eventKey: 'event-123456', type: 'progress', progress: 40 },
  )
  assert.throws(() => parseEvent({ eventKey: 'event-123456', type: 'purchase', progress: 0 }))
  assert.throws(() => parseEvent({ eventKey: 'event-123456', type: 'progress', progress: 101 }))
  assert.throws(() => parseEvent({ eventKey: 'bad key', type: 'exposure' }))
})

test('feedback requires complete scales and limits reasons and notes', () => {
  const feedback = {
    eventKey: 'feedback-123456',
    rating: 4,
    intent: 3,
    expectation: 5,
    note: '',
    reasons: ['ideas'],
  }
  assert.equal(parseFeedback(feedback).rating, 4)
  assert.throws(() => parseFeedback({ ...feedback, intent: 0 }))
  assert.throws(() => parseFeedback({ ...feedback, note: 'a'.repeat(601) }))
  assert.throws(() => parseFeedback({ ...feedback, reasons: ['ideas', 'ideas'] }))
})

test('alignment scores are bounded and retain their model version', () => {
  const low = { atmosphere: 1, relationships: 1, ideas: 1, tension: 1, humor: 1, spectacle: 1 }
  const high = {
    atmosphere: 10,
    relationships: 10,
    ideas: 10,
    tension: 10,
    humor: 10,
    spectacle: 10,
  }
  assert.equal(calculateFit(low, low).score, 100)
  assert.equal(calculateFit(low, high).score, 0)
  assert.equal(calculateFit(low, high).band, 'exploring')
  assert.equal(calculateFit(low, high).modelVersion, 'explicit-fit-v1')
})

test('uncertainty handles zero counts and avoids declaring small-sample winners', () => {
  assert.equal(rateInterval(0, 0).rate, null)
  assert.equal(rateInterval(0, 10).low, 0)
  assert.ok((rateInterval(10, 10).low ?? 0) < 1)
  assert.throws(() => rateInterval(11, 10))
  assert.match(
    compareVariants([
      { label: 'A', exposed: 4, interested: 4 },
      { label: 'B', exposed: 4, interested: 0 },
    ]),
    /at least 30/,
  )
  assert.match(
    compareVariants([
      { label: 'A', exposed: 100, interested: 50 },
      { label: 'B', exposed: 100, interested: 49 },
    ]),
    /overlap/,
  )
})

test('dataset holdouts are stable for an entire work', () => {
  assert.equal(datasetSplit('work-42'), datasetSplit('work-42'))
  const splits = new Set(Array.from({ length: 100 }, (_, i) => datasetSplit(`work-${i}`)))
  assert.deepEqual(splits, new Set(['train', 'evaluation']))
})

test('AI dataset contracts reject reviewed rows with invalid consent or labels', () => {
  const row = {
    consentVersion: AUDIENCE_CONSENT_VERSION,
    assignmentProbability: 0.5,
    facets: DEFAULT_FACETS,
    project: { targetFacets: DEFAULT_FACETS },
    rating: 4,
    intent: 3,
    expectation: 5,
  }
  assert.doesNotThrow(() => assertDatasetRecord(row))
  assert.throws(() => assertDatasetRecord({ ...row, consentVersion: 'unknown-version' }))
  assert.throws(() => assertDatasetRecord({ ...row, assignmentProbability: 0 }))
  assert.throws(() => assertDatasetRecord({ ...row, rating: null }))
  assert.throws(() => assertDatasetRecord({ ...row, facets: { ...DEFAULT_FACETS, humor: 'high' } }))
})

test('direction priorities preserve evidence limits and surface collection bias', () => {
  const priorities = collectionPriorities({
    enrollments: 200,
    exposed: 50,
    responses: 10,
    pending: 10,
    eligible: 10,
    eligibleWorks: 1,
    validationIssues: 2,
    sources: [{ label: 'invite', count: 100 }],
  })
  assert.equal(priorities[0].title, 'Repair data-contract issues')
  assert.ok(priorities.some((p) => p.title === 'Diversify research recruitment'))
  assert.ok(!priorities.some((p) => p.title === 'Prepare an unseen-title evaluation'))
  const empty = collectionPriorities({
    enrollments: 0,
    exposed: 0,
    responses: 0,
    pending: 0,
    eligible: 0,
    eligibleWorks: 0,
    validationIssues: 0,
    sources: [],
  })
  assert.equal(empty[0].title, 'Launch the first collection study')
})

test('CSV exports neutralize spreadsheet formulas and escape quotes', () => {
  assert.equal(csvCell('=IMPORTXML("url")'), '"\'=IMPORTXML(""url"")"')
  assert.equal(csvCell('normal, title'), '"normal, title"')
  assert.match(csvCell('  +cmd'), /^"'/)
})

test('mutations reject cross-origin and cross-site cookie requests', () => {
  assert.doesNotThrow(() =>
    requireSameOrigin(
      new Request('https://nospoilers.xyz/api/audience', {
        headers: { origin: 'https://nospoilers.xyz' },
      }),
    ),
  )
  assert.doesNotThrow(() =>
    requireSameOrigin(
      new Request('http://localhost:3107/api/audience', {
        headers: { host: '127.0.0.1:3107', origin: 'http://127.0.0.1:3107' },
      }),
    ),
  )
  assert.throws(() =>
    requireSameOrigin(
      new Request('https://nospoilers.xyz/api/audience', {
        headers: { origin: 'https://attacker.test' },
      }),
    ),
  )
  assert.throws(() =>
    requireSameOrigin(
      new Request('https://nospoilers.xyz/api/audience', {
        headers: { 'sec-fetch-site': 'cross-site' },
      }),
    ),
  )
})
