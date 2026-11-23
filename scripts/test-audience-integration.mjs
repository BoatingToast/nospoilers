import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { encode } from 'next-auth/jwt'

const testUrl = process.env.AUDIENCE_TEST_DATABASE_URL
if (
  !testUrl ||
  new URL(testUrl).hostname !== '127.0.0.1' ||
  !new URL(testUrl).pathname.endsWith('/audience_engine_test')
)
  throw new Error(
    'Use the disposable localhost audience_engine_test database via AUDIENCE_TEST_DATABASE_URL.',
  )
const base = process.env.AUDIENCE_TEST_BASE_URL ?? 'http://127.0.0.1:3107'
if (new URL(base).hostname !== '127.0.0.1')
  throw new Error('Integration tests must target the isolated local application.')
const db = new PrismaClient({ datasources: { db: { url: testUrl } } })
const secret = 'audience-integration-test-secret'
const prefix = `ae-${randomUUID().slice(0, 8)}`
const actors = []
let checks = 0
function check(condition, message) {
  assert.ok(condition, message)
  checks++
  console.log(`PASS ${message}`)
}
async function actor(name, email, isAdmin = false) {
  const user = await db.user.create({
    data: {
      username: `${prefix}-${name}`,
      email,
      password: 'unused-test-password-hash',
      isAdmin,
      onboardingCompleted: true,
    },
  })
  actors.push(user.id)
  const token = await encode({
    token: {
      id: user.id,
      email: user.email,
      name: user.username,
      onboardingCompleted: true,
      isAdmin: true,
    },
    secret,
  })
  return { ...user, cookie: `next-auth.session-token=${token}` }
}
async function request(path, actor, method = 'GET', body, expected = 200, headers = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(method === 'GET' ? {} : { origin: base }),
      ...(actor ? { cookie: actor.cookie } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: 'manual',
  })
  const text = await response.text()
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: expected ${expected}, received ${response.status}: ${text.slice(0, 500)}`,
  )
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
const facets = { atmosphere: 8, relationships: 7, ideas: 6, tension: 4, humor: 3, spectacle: 2 }
try {
  const admin = await actor('admin', 'emoon0108@gmail.com', true)
  const owner = await actor('owner', `${prefix}-owner@example.test`)
  const other = await actor('other', `${prefix}-other@example.test`, true)
  await request('/api/admin/audience', null, 'GET', undefined, 401)
  await request('/api/admin/audience', owner, 'GET', undefined, 403)
  await request('/api/admin/audience', other, 'GET', undefined, 403)
  check(
    true,
    'Admin API rejects signed-out users, ordinary users, forged admin claims, and non-allowlisted grants',
  )
  const input = {
    workKey: `${prefix}-work`,
    title: `${prefix} first light`,
    description: 'An original concept for audience research.',
    mediaType: 'film',
    rightsNote: 'Test fixture; original creator-owned material.',
    rightsConfirmed: true,
    discoverable: true,
    targetFacets: facets,
    variants: [
      { label: 'A', headline: 'Quiet journeys', concept: 'A quiet film about a journey.' },
      { label: 'B', headline: 'Finding connection', concept: 'An original film about connection.' },
    ],
  }
  await request('/api/audience/projects', owner, 'POST', input, 403, {
    origin: 'https://attacker.test',
  })
  const { id } = await request('/api/audience/projects', owner, 'POST', input, 201)
  await request(`/api/audience/projects/${id}`, other, 'GET', undefined, 404)
  const draft = await request(`/api/audience/projects/${id}`, owner)
  const repeated = await request(
    '/api/audience/projects',
    owner,
    'POST',
    { ...input, title: `${prefix} second study of the same work` },
    201,
  )
  const repeatedReport = await request(`/api/audience/projects/${repeated.id}`, owner)
  check(
    repeatedReport.project.workId === draft.project.workId,
    'Repeated studies reuse a creator-assigned work identity for leakage-safe dataset splits',
  )
  await request(`/api/audience/studies/${draft.project.shareCode}`, null, 'GET', undefined, 404)
  await request(`/api/audience/projects/${id}`, owner, 'PATCH', { status: 'active' })
  const code = draft.project.shareCode
  const metadata = await request(`/api/audience/studies/${code}`, null)
  check(
    !('concept' in metadata) && !('rightsNote' in metadata),
    'Pre-consent metadata omits preview material and internal rights notes',
  )
  await request(
    `/api/audience/studies/${code}/participation`,
    owner,
    'POST',
    { consent: true, reuseConsent: false, facets, primaryInterest: 'ideas' },
    403,
  )
  const viewer = await actor('viewer', `${prefix}-viewer@example.test`)
  await request(
    `/api/audience/studies/${code}/participation`,
    viewer,
    'POST',
    { consent: false, reuseConsent: false, facets, primaryInterest: 'ideas' },
    400,
  )
  const enrollment = {
    consent: true,
    reuseConsent: true,
    facets,
    primaryInterest: 'ideas',
    source: 'invite',
  }
  const [first, second] = await Promise.all([
    request(`/api/audience/studies/${code}/participation`, viewer, 'POST', enrollment),
    request(`/api/audience/studies/${code}/participation`, viewer, 'POST', enrollment),
  ])
  check(
    first.id === second.id && first.headline === second.headline,
    'Concurrent enrollment returns one stable random assignment',
  )
  await request(
    `/api/audience/studies/${code}/events`,
    other,
    'POST',
    { eventKey: 'unauthorized-event', type: 'exposure' },
    403,
  )
  await Promise.all([
    request(`/api/audience/studies/${code}/events`, viewer, 'POST', {
      eventKey: 'exposure-repeat-key',
      type: 'exposure',
    }),
    request(`/api/audience/studies/${code}/events`, viewer, 'POST', {
      eventKey: 'exposure-repeat-key',
      type: 'exposure',
    }),
  ])
  check(
    (await db.audienceEvent.count({ where: { participantId: first.id, type: 'exposure' } })) === 1,
    'Concurrent duplicate events produce one durable observation',
  )
  await request(
    `/api/audience/studies/${code}/events`,
    viewer,
    'POST',
    { eventKey: 'progress-before-start', type: 'progress', progress: 90 },
    409,
  )
  const feedback = {
    eventKey: 'feedback-first-submit',
    rating: 4,
    intent: 5,
    expectation: 4,
    reasons: ['ideas'],
    note: 'The quiet tone works for me.',
  }
  await request(`/api/audience/studies/${code}/feedback`, viewer, 'POST', feedback, 409)
  await db.audienceParticipant.update({
    where: { id: first.id },
    data: { exposedAt: new Date(Date.now() - 20_000) },
  })
  await request(`/api/audience/studies/${code}/events`, viewer, 'POST', {
    eventKey: 'interest-first-submit',
    type: 'interest',
  })
  await request(`/api/audience/studies/${code}/feedback`, viewer, 'POST', feedback)
  await request(`/api/audience/studies/${code}/feedback`, viewer, 'POST', feedback)
  check(
    (await db.audienceEvent.count({ where: { participantId: first.id, type: 'feedback' } })) === 1,
    'Feedback retries are idempotent',
  )
  const smallReport = await request(`/api/audience/projects/${id}`, owner)
  check(
    smallReport.notes.length === 0 &&
      smallReport.cohorts.length === 0 &&
      smallReport.variants.every((v) => v.rating === null),
    'Small-cohort reports suppress notes, cohorts, and rating averages',
  )
  await request('/api/admin/audience/datasets', admin, 'POST', { name: 'No reviewed data' }, 409)
  await request(
    '/api/admin/audience/review',
    owner,
    'PATCH',
    { id: first.id, quality: 'accepted', note: 'test' },
    403,
  )
  await request('/api/admin/audience/review', admin, 'PATCH', {
    id: first.id,
    quality: 'accepted',
    note: 'Coherent response with no identifying information.',
  })
  const dataset = await request(
    '/api/admin/audience/datasets',
    admin,
    'POST',
    { name: `${prefix} reviewed version` },
    201,
  )
  const rows = await request(`/api/admin/audience/datasets/${dataset.id}`, admin)
  const row = typeof rows === 'string' ? JSON.parse(rows.trim().split('\n')[0]) : rows
  check(
    !('userId' in row) && !('note' in row) && !JSON.stringify(row).includes(viewer.email),
    'Dataset excludes account identity, raw notes, and email',
  )
  await request(`/api/admin/audience/datasets/${dataset.id}`, owner, 'GET', undefined, 403)
  const overview = await request('/api/admin/audience?days=30', admin)
  check(
    overview.research.reusable >= 1 && overview.daily.length >= 1,
    'Admin overview aggregates real first-party data',
  )
  const direction = await request('/api/admin/audience/direction?days=30', admin)
  check(
    direction.counts.eligibleWorks === 1 &&
      direction.counts.validationIssues === 0 &&
      direction.media.length === 5,
    'Direction dashboard reports work diversity, media coverage, and data-contract health',
  )
  const acceptedHistory = await request('/api/admin/audience/responses?quality=accepted', admin)
  check(
    acceptedHistory.rows.some((p) => p.id === first.id),
    'Quality review includes retrievable review history',
  )
  await db.audienceParticipant.update({
    where: { id: first.id },
    data: { assignmentProbability: 0 },
  })
  await request(
    '/api/admin/audience/datasets',
    admin,
    'POST',
    { name: 'Invalid accepted sample' },
    409,
  )
  await db.audienceParticipant.update({
    where: { id: first.id },
    data: { assignmentProbability: 0.5 },
  })
  check(true, 'Dataset creation blocks accepted records that fail the data contract')
  const explorer = await request('/api/admin/audience/events', admin)
  check(
    explorer.rows.length > 0 && !JSON.stringify(explorer).includes(viewer.email),
    'Admin event explorer exposes lineage without account email',
  )
  await request(`/api/admin/audience/projects/${id}`, admin)
  await request(`/api/audience/studies/${code}/feedback`, viewer, 'POST', {
    ...feedback,
    eventKey: 'feedback-correction',
    rating: 2,
  })
  await request(`/api/admin/audience/datasets/${dataset.id}`, admin, 'GET', undefined, 410)
  check(true, 'Feedback correction invalidates previously frozen dataset versions')
  await request('/api/admin/audience/review', admin, 'PATCH', {
    id: first.id,
    quality: 'accepted',
    note: 'Correction reviewed.',
  })
  const next = await request(
    '/api/admin/audience/datasets',
    admin,
    'POST',
    { name: `${prefix} corrected version` },
    201,
  )
  await request(`/api/audience/studies/${code}/participation`, viewer, 'DELETE')
  await request(`/api/admin/audience/datasets/${next.id}`, admin, 'GET', undefined, 410)
  check(
    (await db.audienceEvent.count({ where: { participantId: first.id } })) === 0 &&
      (await db.audienceParticipant.count({ where: { id: first.id } })) === 0,
    'Withdrawal removes response/event records and disables affected datasets',
  )
  await request(`/api/audience/projects/${id}`, owner, 'PATCH', { status: 'completed' })
  await request(`/api/audience/projects/${id}`, owner, 'PATCH', { status: 'active' }, 409)
  check(true, 'Completed studies cannot be silently reopened')
  console.log(`Audience Engine integration: ${checks} checks passed.`)
} finally {
  await db.user.deleteMany({ where: { id: { in: actors } } })
  await db.$disconnect()
}
