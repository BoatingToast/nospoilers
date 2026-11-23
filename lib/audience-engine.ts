export const AUDIENCE_SCHEMA_VERSION = 1
export const AUDIENCE_DATASET_SCHEMA_VERSION = 2
export const AUDIENCE_CONSENT_VERSION = 'audience-research-2026-11-v1'
export const AUDIENCE_MODEL_VERSION = 'explicit-fit-v1'
export const MIN_COHORT_SIZE = 5
export const MEDIA_TYPES = ['film', 'series', 'game', 'book', 'music'] as const
export const FACETS = [
  'atmosphere',
  'relationships',
  'ideas',
  'tension',
  'humor',
  'spectacle',
] as const
export type Facet = (typeof FACETS)[number]
export type Facets = Record<Facet, number>
export const FACET_LABELS: Record<Facet, string> = {
  atmosphere: 'Atmosphere',
  relationships: 'Characters & relationships',
  ideas: 'Ideas & complexity',
  tension: 'Suspense & tension',
  humor: 'Humor',
  spectacle: 'Action & spectacle',
}
export const DEFAULT_FACETS: Facets = {
  atmosphere: 5,
  relationships: 5,
  ideas: 5,
  tension: 5,
  humor: 5,
  spectacle: 5,
}
export const EVENT_TYPES = ['exposure', 'start', 'progress', 'interest'] as const
export const QUALITY_STATES = ['pending', 'accepted', 'excluded'] as const
export type QualityState = (typeof QUALITY_STATES)[number]

export class AudienceError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'AudienceError'
    this.status = status
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new AudienceError('Provide a valid request.')
  return value as Record<string, unknown>
}

function textField(body: Record<string, unknown>, key: string, max: number, required = false) {
  const value = typeof body[key] === 'string' ? body[key].trim() : ''
  if ((required && !value) || value.length > max)
    throw new AudienceError(`${key} must contain ${required ? '1' : '0'}–${max} characters.`)
  return value
}

export function parseFacets(value: unknown): Facets {
  const body = record(value)
  const result = { ...DEFAULT_FACETS }
  for (const key of FACETS) {
    if (
      typeof body[key] !== 'number' ||
      !Number.isInteger(body[key]) ||
      body[key] < 1 ||
      body[key] > 10
    )
      throw new AudienceError('Choose a value from 1 to 10 for every taste dimension.')
    result[key] = body[key]
  }
  return result
}

export function readFacets(value: unknown): Facets {
  try {
    return parseFacets(value)
  } catch {
    return { ...DEFAULT_FACETS }
  }
}

export function parseStudy(value: unknown) {
  const body = record(value)
  const title = textField(body, 'title', 120, true)
  const workKey = textField(body, 'workKey', 120, true)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
  const description = textField(body, 'description', 1200, true)
  const rightsNote = textField(body, 'rightsNote', 600, true)
  if (body.rightsConfirmed !== true)
    throw new AudienceError('Confirm that you may use these assets for audience research.')
  if (!MEDIA_TYPES.includes(body.mediaType as (typeof MEDIA_TYPES)[number]))
    throw new AudienceError('Choose a supported medium.')
  if (typeof body.discoverable !== 'boolean')
    throw new AudienceError('Choose whether members can discover this study.')
  if (!Array.isArray(body.variants) || body.variants.length < 1 || body.variants.length > 3)
    throw new AudienceError('Add between one and three preview variants.')
  const variants = body.variants.map((value, index) => {
    const variant = record(value)
    const label = textField(variant, 'label', 60, true)
    const headline = textField(variant, 'headline', 180, true)
    const concept = textField(variant, 'concept', 5000)
    const uploadId = textField(variant, 'uploadId', 128)
    if (!concept && !uploadId)
      throw new AudienceError(
        'Each variant needs preview text or one of your completed video uploads.',
      )
    return { label, headline, concept, uploadId: uploadId || null, position: index }
  })
  if (new Set(variants.map((v) => v.label.toLowerCase())).size !== variants.length)
    throw new AudienceError('Give each variant a different label.')
  return {
    title,
    workKey,
    description,
    rightsNote,
    mediaType: body.mediaType as (typeof MEDIA_TYPES)[number],
    discoverable: body.discoverable,
    targetFacets: parseFacets(body.targetFacets),
    variants,
  }
}

export function parseEnrollment(value: unknown) {
  const body = record(value)
  if (body.consent !== true)
    throw new AudienceError('Agree to this study’s research notice to participate.')
  if (typeof body.reuseConsent !== 'boolean')
    throw new AudienceError('Choose whether to contribute to the shared research dataset.')
  if (!FACETS.includes(body.primaryInterest as Facet))
    throw new AudienceError('Choose what most draws you to entertainment.')
  const sources = ['invite', 'discovery', 'creator_campaign']
  return {
    reuseConsent: body.reuseConsent,
    primaryInterest: body.primaryInterest as Facet,
    facets: parseFacets(body.facets),
    source: sources.includes(String(body.source)) ? String(body.source) : 'invite',
  }
}

export function parseEvent(value: unknown) {
  const body = record(value)
  const eventKey = textField(body, 'eventKey', 80, true)
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(eventKey))
    throw new AudienceError('Provide a valid event identifier.')
  if (!EVENT_TYPES.includes(body.type as (typeof EVENT_TYPES)[number]))
    throw new AudienceError('Unsupported audience event.')
  const progress = body.progress ?? 0
  if (typeof progress !== 'number' || !Number.isInteger(progress) || progress < 0 || progress > 100)
    throw new AudienceError('Progress must be between 0 and 100.')
  return { eventKey, type: body.type as (typeof EVENT_TYPES)[number], progress }
}

export function parseFeedback(value: unknown) {
  const body = record(value)
  const eventKey = textField(body, 'eventKey', 80, true)
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(eventKey))
    throw new AudienceError('Provide a valid feedback identifier.')
  for (const key of ['rating', 'intent', 'expectation']) {
    if (
      typeof body[key] !== 'number' ||
      !Number.isInteger(body[key]) ||
      body[key] < 1 ||
      body[key] > 5
    )
      throw new AudienceError('Answer all three questions on a 1–5 scale.')
  }
  const reasons = Array.isArray(body.reasons)
    ? body.reasons.filter((v): v is Facet => FACETS.includes(v as Facet))
    : []
  if (reasons.length > 3 || new Set(reasons).size !== reasons.length)
    throw new AudienceError('Choose up to three different reasons.')
  return {
    eventKey,
    rating: body.rating as number,
    intent: body.intent as number,
    expectation: body.expectation as number,
    reasons,
    note: textField(body, 'note', 600),
  }
}

export function calculateFit(preferences: Facets, target: Facets) {
  const score = Math.round(
    100 *
      (1 -
        FACETS.reduce((sum, key) => sum + Math.abs(preferences[key] - target[key]), 0) /
          (FACETS.length * 9)),
  )
  const reasons = [...FACETS]
    .sort((a, b) => Math.abs(preferences[a] - target[a]) - Math.abs(preferences[b] - target[b]))
    .slice(0, 2)
  return {
    score,
    band: score >= 75 ? 'close' : score >= 50 ? 'adjacent' : 'exploring',
    reasons,
    modelVersion: AUDIENCE_MODEL_VERSION,
  }
}

// Wilson score intervals remain informative at small n, including 0/n and n/n.
export function rateInterval(successes: number, total: number) {
  if (total === 0) return { rate: null, low: null, high: null }
  if (successes < 0 || successes > total || total < 0)
    throw new AudienceError('Invalid metric denominator.')
  const p = successes / total,
    z = 1.959963984540054
  const denominator = 1 + (z * z) / total
  const center = (p + (z * z) / (2 * total)) / denominator
  const margin = (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total)) / denominator
  return { rate: p, low: Math.max(0, center - margin), high: Math.min(1, center + margin) }
}

export function compareVariants(
  rows: Array<{ label: string; exposed: number; interested: number }>,
) {
  if (rows.length < 2) return 'Add a second variant to compare audience response.'
  if (rows.some((row) => row.exposed < 30))
    return 'Collect at least 30 exposed participants per variant before reading a directional comparison.'
  const ranked = rows
    .map((row) => ({ ...row, ...rateInterval(row.interested, row.exposed) }))
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))
  if ((ranked[0].low ?? 0) <= (ranked[1].high ?? 1))
    return 'The 95% response intervals overlap. There is no clear leader yet.'
  return `${ranked[0].label} has the strongest observed interest rate with separated 95% intervals. Confirm it in another study; this is not a sales or causal-lift estimate.`
}

// Split entire projects, rather than viewers from the same work, to avoid
// placing almost-identical title observations in both training and evaluation.
export function datasetSplit(projectId: string): 'train' | 'evaluation' {
  let hash = 2166136261
  for (let i = 0; i < projectId.length; i++)
    hash = Math.imul(hash ^ projectId.charCodeAt(i), 16777619)
  return (hash >>> 0) % 5 === 0 ? 'evaluation' : 'train'
}

export function assertDatasetRecord(value: {
  consentVersion: string
  assignmentProbability: number
  facets: unknown
  project: { targetFacets: unknown }
  rating: number | null
  intent: number | null
  expectation: number | null
}) {
  if (
    value.consentVersion !== AUDIENCE_CONSENT_VERSION ||
    !Number.isFinite(value.assignmentProbability) ||
    value.assignmentProbability <= 0 ||
    value.assignmentProbability > 1
  )
    throw new AudienceError(
      'A reviewed response fails the consent or assignment data contract. Correct or exclude it before exporting.',
      409,
    )
  try {
    parseFacets(value.facets)
    parseFacets(value.project.targetFacets)
  } catch {
    throw new AudienceError(
      'A reviewed response has invalid preference or work labels. Correct or exclude it before exporting.',
      409,
    )
  }
  if (
    [value.rating, value.intent, value.expectation].some(
      (v) => v === null || !Number.isInteger(v) || v < 1 || v > 5,
    )
  )
    throw new AudienceError(
      'A reviewed response has incomplete outcome scales. Correct or exclude it before exporting.',
      409,
    )
}

export function csvCell(value: unknown) {
  let text = value === null || value === undefined ? '' : String(value)
  // Spreadsheet formula injection also applies to exported, user-supplied titles.
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const denied = () => {
    throw new AudienceError('Open NoSpoilers directly to make this change.', 403)
  }
  if (request.headers.get('sec-fetch-site') === 'cross-site') denied()
  if (origin) {
    let source: URL
    try {
      source = new URL(origin)
    } catch {
      return denied()
    }
    // Next's internal request URL can use localhost behind its proxy. The HTTP
    // Host header is the browser's destination and is not script-settable.
    const destinationHost = request.headers.get('host') ?? new URL(request.url).host
    if (!['https:', 'http:'].includes(source.protocol) || source.host !== destinationHost) denied()
  }
}
