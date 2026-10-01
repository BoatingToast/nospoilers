import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { buildAudienceLabInsights, parseAudienceFeedback } from '../lib/audience-lab.ts'

test('audience feedback accepts structured, trimmed responses', () => {
  assert.deepEqual(parseAudienceFeedback({
    rating: 4,
    recommendScore: 8,
    pacing: 'just_right',
    reactions: ['moved', 'surprised', 'moved'],
    standoutMoment: '  The quiet final shot.  ',
    improvement: '',
  }), {
    rating: 4,
    recommendScore: 8,
    pacing: 'just_right',
    reactions: ['moved', 'surprised'],
    standoutMoment: 'The quiet final shot.',
    improvement: null,
  })
})

test('audience feedback rejects unbounded or unsupported values', () => {
  for (const input of [
    {},
    { rating: 0 },
    { rating: 5, recommendScore: 11 },
    { rating: 5, pacing: 'perfect' },
    { rating: 5, reactions: ['moved', 'excited', 'tense', 'amused'] },
    { rating: 5, reactions: ['unsafe'] },
    { rating: 5, improvement: 'x'.repeat(601) },
  ]) assert.throws(() => parseAudienceFeedback(input))
})

test('audience lab creates anonymous product signals and protects small taste cohorts', () => {
  const taste = {
    suspenseScore: 8, emotionalImpactScore: 9, complexityScore: 6, humorScore: 4,
    realismScore: 7, actionScore: 5, darknessScore: 8,
  }
  const rows = [
    { watched: true, rating: 5, recommendScore: 10, pacing: 'just_right', reactions: ['moved', 'surprised'], standoutMoment: 'The ending', improvement: null, feedbackAt: new Date(), taste },
    { watched: true, rating: 4, recommendScore: 8, pacing: 'just_right', reactions: ['moved'], standoutMoment: null, improvement: 'A shorter opening', feedbackAt: new Date(), taste: { ...taste, humorScore: 6 } },
    { watched: true, rating: 3, recommendScore: 7, pacing: 'too_slow', reactions: ['curious'], standoutMoment: null, improvement: null, feedbackAt: new Date(), taste: { ...taste, suspenseScore: 6 } },
    { watched: true, rating: null, recommendScore: null, pacing: null, reactions: [], standoutMoment: null, improvement: null, feedbackAt: null, taste: null },
  ]
  const result = buildAudienceLabInsights(rows)
  assert.equal(result.responseCount, 3)
  assert.equal(result.completionRate, 75)
  assert.equal(result.averageRating, 4)
  assert.equal(result.averageRecommendScore, 8.3)
  assert.equal(result.strongRecommendRate, 67)
  assert.equal(result.pacing.just_right, 2)
  assert.equal(result.reactions[0].reaction, 'moved')
  assert.equal(result.comments.length, 2)
  assert.equal(result.tasteProfile?.humorScore, 4.7)
  assert.ok(result.takeaways.some(item => item.includes('Emotion')))

  assert.equal(buildAudienceLabInsights(rows.slice(0, 2)).tasteProfile, null)
})
