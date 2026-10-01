export class AudienceLabValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AudienceLabValidationError'
  }
}

export const AUDIENCE_REACTIONS = [
  'moved',
  'excited',
  'tense',
  'surprised',
  'amused',
  'curious',
  'confused',
] as const

export const PACING_SIGNALS = ['too_slow', 'just_right', 'too_fast'] as const

export type AudienceReaction = typeof AUDIENCE_REACTIONS[number]
export type PacingSignal = typeof PACING_SIGNALS[number]

export interface AudienceFeedbackInput {
  rating: number
  recommendScore: number | null
  pacing: PacingSignal | null
  reactions: AudienceReaction[]
  standoutMoment: string | null
  improvement: string | null
}

export interface AudienceTasteSnapshot {
  suspenseScore: number
  emotionalImpactScore: number
  complexityScore: number
  humorScore: number
  realismScore: number
  actionScore: number
  darknessScore: number
}

export interface AudienceInsightRow {
  watched: boolean
  rating: number | null
  recommendScore: number | null
  pacing: string | null
  reactions: string[]
  standoutMoment: string | null
  improvement: string | null
  feedbackAt: Date | string | null
  taste: AudienceTasteSnapshot | null
}

export interface AudienceLabInsights {
  watchedCount: number
  responseCount: number
  completionRate: number | null
  averageRating: number | null
  averageRecommendScore: number | null
  strongRecommendRate: number | null
  pacing: Record<PacingSignal, number>
  reactions: Array<{ reaction: AudienceReaction; count: number; percentage: number }>
  comments: Array<{ kind: 'standout' | 'improvement'; text: string }>
  tasteProfile: AudienceTasteSnapshot | null
  takeaways: string[]
}

export interface AudienceLabListItem {
  id: string
  title: string
  kind: 'film' | 'trailer'
  startsAt: string
  status: 'upcoming' | 'live' | 'ended' | 'cancelled'
  capacity: number
  reservedCount: number
  watchedCount: number
  responseCount: number
  averageRating: number | null
}

export interface AudienceLabReportData {
  id: string
  title: string
  kind: 'film' | 'trailer'
  startsAt: string
  status: 'upcoming' | 'live' | 'ended' | 'cancelled'
  capacity: number
  reservedCount: number
  insights: AudienceLabInsights
}

const MAX_COMMENT_LENGTH = 600
const TASTE_PRIVACY_THRESHOLD = 3

function optionalText(value: unknown, field: string) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw new AudienceLabValidationError(`${field} must be text.`)
  const text = value.trim()
  if (text.length > MAX_COMMENT_LENGTH) throw new AudienceLabValidationError(`${field} must be ${MAX_COMMENT_LENGTH} characters or fewer.`)
  return text || null
}

export function parseAudienceFeedback(value: unknown): AudienceFeedbackInput {
  if (!value || typeof value !== 'object') throw new AudienceLabValidationError('Add your audience response.')
  const body = value as Record<string, unknown>
  if (typeof body.rating !== 'number' || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    throw new AudienceLabValidationError('Choose an overall rating from 1 to 5 stars.')
  }
  const recommendScore = body.recommendScore === undefined || body.recommendScore === null
    ? null
    : body.recommendScore
  if (recommendScore !== null && (typeof recommendScore !== 'number' || !Number.isInteger(recommendScore) || recommendScore < 0 || recommendScore > 10)) {
    throw new AudienceLabValidationError('Recommendation intent must be from 0 to 10.')
  }
  const pacing = body.pacing === undefined || body.pacing === null || body.pacing === '' ? null : body.pacing
  if (pacing !== null && !PACING_SIGNALS.includes(pacing as PacingSignal)) {
    throw new AudienceLabValidationError('Choose a supported pacing response.')
  }
  if (body.reactions !== undefined && !Array.isArray(body.reactions)) throw new AudienceLabValidationError('Choose up to three audience reactions.')
  const reactions = [...new Set((body.reactions ?? []) as unknown[])]
  if (reactions.length > 3 || reactions.some(reaction => typeof reaction !== 'string' || !AUDIENCE_REACTIONS.includes(reaction as AudienceReaction))) {
    throw new AudienceLabValidationError('Choose up to three supported audience reactions.')
  }
  return {
    rating: body.rating,
    recommendScore,
    pacing: pacing as PacingSignal | null,
    reactions: reactions as AudienceReaction[],
    standoutMoment: optionalText(body.standoutMoment, 'The standout moment'),
    improvement: optionalText(body.improvement, 'The improvement note'),
  }
}

function percentage(count: number, total: number) {
  return total ? Math.round(count / total * 100) : 0
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null
}

function averageTaste(rows: AudienceInsightRow[]) {
  const profiles = rows.flatMap(row => row.rating !== null && row.taste ? [row.taste] : [])
  if (profiles.length < TASTE_PRIVACY_THRESHOLD) return null
  const keys = [
    'suspenseScore', 'emotionalImpactScore', 'complexityScore', 'humorScore',
    'realismScore', 'actionScore', 'darknessScore',
  ] as const
  return Object.fromEntries(keys.map(key => [key, average(profiles.map(profile => profile[key])) ?? 0])) as unknown as AudienceTasteSnapshot
}

export function buildAudienceLabInsights(rows: AudienceInsightRow[]): AudienceLabInsights {
  const watchedCount = rows.filter(row => row.watched).length
  const responses = rows.filter(row => row.rating !== null)
  const recommendationScores = responses.flatMap(row => row.recommendScore === null ? [] : [row.recommendScore])
  const pacing = Object.fromEntries(PACING_SIGNALS.map(signal => [signal, responses.filter(row => row.pacing === signal).length])) as Record<PacingSignal, number>
  const reactionCounts = AUDIENCE_REACTIONS.map(reaction => ({
    reaction,
    count: responses.filter(row => row.reactions.includes(reaction)).length,
  })).filter(item => item.count > 0).sort((a, b) => b.count - a.count || a.reaction.localeCompare(b.reaction))
  const reactions = reactionCounts.map(item => ({ ...item, percentage: percentage(item.count, responses.length) }))
  const comments = responses.flatMap(row => [
    ...(row.standoutMoment ? [{ kind: 'standout' as const, text: row.standoutMoment }] : []),
    ...(row.improvement ? [{ kind: 'improvement' as const, text: row.improvement }] : []),
  ])
  const averageRating = average(responses.map(row => row.rating!))
  const averageRecommendScore = average(recommendationScores)
  const strongRecommendRate = recommendationScores.length
    ? percentage(recommendationScores.filter(score => score >= 8).length, recommendationScores.length)
    : null
  const takeaways: string[] = []
  if (responses.length >= 3) {
    if (strongRecommendRate !== null && strongRecommendRate >= 70) takeaways.push('Strong word-of-mouth potential: most respondents would actively recommend it.')
    if (strongRecommendRate !== null && strongRecommendRate < 40) takeaways.push('Word-of-mouth is the clearest opportunity to improve before launch.')
    const pacingResponses = pacing.too_slow + pacing.just_right + pacing.too_fast
    if (pacingResponses && percentage(pacing.too_slow, pacingResponses) >= 35) takeaways.push('A meaningful share of viewers felt the cut moved too slowly.')
    if (pacingResponses && percentage(pacing.too_fast, pacingResponses) >= 35) takeaways.push('A meaningful share of viewers wanted more room for the story to breathe.')
    if (pacingResponses && percentage(pacing.just_right, pacingResponses) >= 70) takeaways.push('Pacing is landing well with this audience.')
    if (reactions[0]?.percentage >= 40) takeaways.push(`${reactionLabel(reactions[0].reaction)} was the audience’s strongest shared reaction.`)
  }
  return {
    watchedCount,
    responseCount: responses.length,
    completionRate: watchedCount ? percentage(responses.length, watchedCount) : null,
    averageRating,
    averageRecommendScore,
    strongRecommendRate,
    pacing,
    reactions,
    comments,
    tasteProfile: averageTaste(rows),
    takeaways,
  }
}

export function reactionLabel(reaction: AudienceReaction) {
  return ({
    moved: 'Emotion', excited: 'Excitement', tense: 'Tension', surprised: 'Surprise',
    amused: 'Humor', curious: 'Curiosity', confused: 'Confusion',
  } satisfies Record<AudienceReaction, string>)[reaction]
}

export function pacingLabel(pacing: PacingSignal) {
  return ({ too_slow: 'Too slow', just_right: 'Just right', too_fast: 'Too fast' } satisfies Record<PacingSignal, string>)[pacing]
}
