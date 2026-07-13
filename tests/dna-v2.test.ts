import assert from 'node:assert/strict'
import test from 'node:test'
// Node 22 runs this erasable TypeScript test directly. The .ts suffix is
// required at runtime even though the app's bundler normally omits it.
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { analyzeReviewTraits, calculateRatingAffinities, computeDeterministicDNA, NEUTRAL_DNA } from '../services/dna-v2.ts'
import type { DNAScores } from '../types'

function vibe(overrides: Partial<DNAScores>): DNAScores {
  return { ...NEUTRAL_DNA, ...overrides }
}

const baseline = vibe({ complexityScore: 7, emotionalImpactScore: 6 })
const ratings = [
  { score: 95, vibe: vibe({ actionScore: 9, suspenseScore: 8 }) },
  { score: 42, vibe: vibe({ darknessScore: 9, suspenseScore: 9 }) },
  { score: 78, vibe: vibe({ humorScore: 8, emotionalImpactScore: 7 }) },
]
const topFive = [
  { weight: 1, vibe: vibe({ complexityScore: 9 }) },
  { weight: 0.9, vibe: vibe({ emotionalImpactScore: 9 }) },
]

test('recalculation is idempotent and ignores persisted output', () => {
  const input = { baseline, ratings, topFive }
  assert.deepEqual(computeDeterministicDNA(input), computeDeterministicDNA(input))
})

test('rating and Top Five input order do not change the result', () => {
  const forward = computeDeterministicDNA({ baseline, ratings, topFive })
  const reversed = computeDeterministicDNA({
    baseline,
    ratings: [...ratings].reverse(),
    topFive: [...topFive].reverse(),
  })
  assert.deepEqual(reversed, forward)
})

test('deleting evidence returns the exact result for the remaining evidence', () => {
  const beforeAddingSecond = computeDeterministicDNA({
    baseline,
    ratings: [ratings[0]],
    topFive,
  })
  computeDeterministicDNA({ baseline, ratings: ratings.slice(0, 2), topFive })
  const afterDeletingSecond = computeDeterministicDNA({
    baseline,
    ratings: [ratings[0]],
    topFive,
  })
  assert.deepEqual(afterDeletingSecond, beforeAddingSecond)
})

test('the same raw score is normalized to the user rating style', () => {
  const generous = calculateRatingAffinities([75, 88, 91, 94, 97, 99])
  const harsh = calculateRatingAffinities([75, 58, 52, 47, 41, 35])
  assert.ok(generous[0].combined < harsh[0].combined)
  assert.ok(generous[0].combined < 0)
  assert.ok(harsh[0].combined > 0)
})

test('review trait evidence stays on the DNA 1–10 scale', () => {
  const traits = analyzeReviewTraits(
    'A complex, layered, nuanced, deep, cerebral, philosophical and profound film.',
  )
  assert.equal(traits.complexityScore, 10)
  for (const value of Object.values(traits)) {
    assert.ok(value >= 1 && value <= 10)
  }
})
