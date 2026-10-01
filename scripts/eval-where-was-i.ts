import { readFile } from 'node:fs/promises'
// @ts-expect-error explicit TypeScript extension is intentional for the Node runner
import { buildExtractiveAnswer, filterEvidenceAtBoundary, type EvidenceRecord } from '../lib/where-was-i.ts'

interface Case {
  id: string
  checkpoint: number
  question: string
  characterKey?: string
  expectedStatus: 'supported' | 'insufficient'
  required?: string[]
  forbidden?: string[]
}

interface Corpus {
  checkpoints: Array<{ id: string; ordinal: number; label: string }>
  evidence: Array<{
    id: string
    earliestCheckpointId: string
    kind: string
    characterKey?: string
    text: string
    sourceLabel: string
    sourceRef: string
    sourceExcerpt: string
  }>
}

const corpus = JSON.parse(await readFile(new URL('../data/where-was-i/the-signal-at-kestrel.json', import.meta.url), 'utf8')) as Corpus
const cases = JSON.parse(await readFile(new URL('../evals/where-was-i-cases.json', import.meta.url), 'utf8')) as Case[]
const checkpointById = new Map(corpus.checkpoints.map(checkpoint => [checkpoint.id, checkpoint]))
const evidence: EvidenceRecord[] = corpus.evidence.map(item => {
  const checkpoint = checkpointById.get(item.earliestCheckpointId)
  if (!checkpoint) throw new Error(`Unknown checkpoint ${item.earliestCheckpointId}`)
  return {
    ...item,
    characterKey: item.characterKey ?? null,
    earliestOrdinal: checkpoint.ordinal,
    earliestCheckpointLabel: checkpoint.label,
  }
})

const results = cases.map(testCase => {
  const started = performance.now()
  const answer = buildExtractiveAnswer(
    testCase.question,
    filterEvidenceAtBoundary(evidence, testCase.checkpoint),
    { characterKey: testCase.characterKey },
  )
  const latencyMs = performance.now() - started
  const statusMatch = answer.status === testCase.expectedStatus
  const requiredMatch = (testCase.required ?? []).every(fragment =>
    answer.text.toLocaleLowerCase('en-US').includes(fragment.toLocaleLowerCase('en-US')))
  const leakage = (testCase.forbidden ?? []).filter(fragment =>
    answer.text.toLocaleLowerCase('en-US').includes(fragment.toLocaleLowerCase('en-US')))
  return {
    id: testCase.id,
    passed: statusMatch && requiredMatch && leakage.length === 0,
    status: answer.status,
    answer: answer.text,
    leakage,
    latencyMs: Number(latencyMs.toFixed(3)),
    estimatedCostUsd: 0,
  }
})

const passed = results.filter(result => result.passed).length
const useful = results.filter(result => result.status === 'supported').length
const meanLatencyMs = results.reduce((sum, result) => sum + result.latencyMs, 0) / Math.max(1, results.length)

console.log(JSON.stringify({
  mode: 'deterministic-extractive',
  cases: results.length,
  passed,
  leakageFailures: results.filter(result => result.leakage.length > 0).length,
  supportedAnswers: useful,
  neutralFallbacks: results.length - useful,
  meanLatencyMs: Number(meanLatencyMs.toFixed(3)),
  estimatedCostUsd: 0,
  warning: 'A small adversarial suite does not establish a zero-spoiler guarantee.',
  results,
}, null, 2))

if (passed !== results.length) process.exitCode = 1
