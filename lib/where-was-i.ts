export const INSUFFICIENT_MATERIAL_MESSAGE =
  'The material available at your selected progress doesn’t establish that.'

export type EvidenceKind =
  | 'identity'
  | 'relationship'
  | 'viewer_fact'
  | 'character_knowledge'
  | 'unresolved'

export interface EvidenceClaim {
  text: string
  evidenceIds: string[]
}

export interface EvidenceRecord {
  id: string
  kind: EvidenceKind | string
  characterKey: string | null
  text: string
  sourceLabel: string
  sourceRef: string
  sourceExcerpt: string
  earliestOrdinal: number
  earliestCheckpointLabel: string
}

export interface EvidenceReference {
  id: string
  sourceLabel: string
  sourceRef: string
  excerpt: string
  earliestCheckpoint: string
}

export interface GroundedAnswer {
  status: 'supported' | 'insufficient'
  text: string
  evidenceIds: string[]
  references: EvidenceReference[]
  method: 'extractive' | 'model-selected'
  cached?: boolean
  model?: string
  latencyMs?: number
  inputTokens?: number
  outputTokens?: number
  estimatedCostMicros?: number
}

const SOURCE_INJECTION_PATTERNS = [
  /ignore (?:all |any |the )?(?:previous|prior|above) instructions?/i,
  /(?:system|developer|assistant)\s*(?:message|prompt)?\s*:/i,
  /reveal (?:the )?(?:future|ending|spoiler)/i,
  /you are (?:now|an?)/i,
  /<\/?(?:system|assistant|developer)>/i,
]

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'at', 'be', 'did', 'do', 'does', 'for', 'from',
  'had', 'has', 'have', 'he', 'her', 'hers', 'him', 'his', 'how', 'i', 'in',
  'is', 'it', 'its', 'me', 'of', 'on', 'or', 'she', 'that', 'the', 'their',
  'them', 'they', 'this', 'to', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'who', 'why', 'with', 'you', 'yet', 'right', 'now',
])

export function containsSourceInjection(text: string): boolean {
  return SOURCE_INJECTION_PATTERNS.some(pattern => pattern.test(text))
}

export function normalizeQuestion(question: string): string {
  return question.replace(/\s+/g, ' ').trim().slice(0, 500)
}

export function resumeCacheIdentity(input: {
  userId: string
  titleId: string
  checkpointId: string
  sourceVersion: number
  questionHash: string
}): string {
  return JSON.stringify([
    input.userId,
    input.titleId,
    input.checkpointId,
    input.sourceVersion,
    input.questionHash,
  ])
}

export function shouldInvalidateCachedCheckpoint(cachedOrdinal: number, authorizedOrdinal: number): boolean {
  return cachedOrdinal > authorizedOrdinal
}

export function validateSelectedEvidenceIds(
  selectedIds: string[],
  allowedEvidence: EvidenceRecord[],
  maximum = 3,
): EvidenceRecord[] | null {
  if (selectedIds.length === 0 || selectedIds.length > maximum) return null
  if (new Set(selectedIds).size !== selectedIds.length) return null
  const byId = new Map(allowedEvidence.map(item => [item.id, item]))
  if (selectedIds.some(id => !byId.has(id))) return null
  return selectedIds.map(id => byId.get(id) as EvidenceRecord)
}

function tokens(value: string): string[] {
  return Array.from(new Set(
    value
      .toLocaleLowerCase('en-US')
      .replace(/[^a-z0-9' -]/g, ' ')
      .split(/\s+/)
      .map(token => token.replace(/^'+|'+$/g, ''))
      .filter(token => token.length > 1 && !STOP_WORDS.has(token)),
  ))
}

export function filterEvidenceAtBoundary(
  evidence: EvidenceRecord[],
  authorizedOrdinal: number,
): EvidenceRecord[] {
  return evidence.filter(item =>
    item.earliestOrdinal <= authorizedOrdinal &&
    !containsSourceInjection(`${item.text}\n${item.sourceExcerpt}`),
  )
}

export function resolveClaims(
  claims: EvidenceClaim[],
  evidence: EvidenceRecord[],
): Array<EvidenceClaim & { references: EvidenceReference[] }> {
  const byId = new Map(evidence.map(item => [item.id, item]))
  return claims.flatMap(claim => {
    if (!claim.evidenceIds.length) return []
    const support = claim.evidenceIds.map(id => byId.get(id))
    if (support.some(item => !item)) return []
    return [{
      ...claim,
      references: (support as EvidenceRecord[]).map(toReference),
    }]
  })
}

export function rankEvidenceCandidates(
  questionInput: string,
  allowedEvidence: EvidenceRecord[],
  options: { characterKey?: string | null } = {},
): EvidenceRecord[] {
  const question = normalizeQuestion(questionInput)
  const questionTokens = tokens(question)
  if (!question || questionTokens.length === 0) return []

  const asksCharacterKnowledge = /\b(?:what|which)\b.{0,50}\b(?:know|knows|knew|aware)\b/i.test(question)
  const asksIdentity = /\bwho (?:is|was|are)\b/i.test(question)
  const asksForUnsupportedOutcome = /\b(?:who killed|does .+ die|did .+ die|ending|finale|what happens next|later episode|future episode|new identity|identity does|after leaving)\b/i.test(question)

  const scored = allowedEvidence
    .filter(item => {
      if (asksCharacterKnowledge) {
        return Boolean(options.characterKey) &&
          item.kind === 'character_knowledge' &&
          item.characterKey === options.characterKey
      }
      if (options.characterKey && item.characterKey && item.characterKey !== options.characterKey) return false
      if (asksIdentity) return item.kind === 'identity' || item.kind === 'unresolved'
      return item.kind !== 'character_knowledge'
    })
    .map(item => {
      const haystack = new Set(tokens(`${item.text} ${item.sourceExcerpt}`))
      const overlap = questionTokens.filter(token => haystack.has(token)).length
      const characterBoost = options.characterKey && item.characterKey === options.characterKey ? 2 : 0
      const phraseBoost = questionTokens.length > 1 &&
        item.text.toLocaleLowerCase('en-US').includes(questionTokens.join(' ')) ? 3 : 0
      return { item, score: overlap + phraseBoost + characterBoost }
    })
    .filter(({ score }) => {
      if (asksCharacterKnowledge && options.characterKey) return score >= 2
      if (asksForUnsupportedOutcome) return score >= 3
      if (/^\s*why\b/i.test(question)) return score >= 3
      return score >= Math.min(2, questionTokens.length)
    })
    .sort((a, b) => b.score - a.score || b.item.earliestOrdinal - a.item.earliestOrdinal)

  if (scored.length === 0) return []

  if (asksCharacterKnowledge && options.characterKey) {
    const newestOrdinal = Math.max(...scored.map(row => row.item.earliestOrdinal))
    return scored.filter(row => row.item.earliestOrdinal === newestOrdinal).slice(0, 3).map(row => row.item)
  }

  // Identity can change only when newly established. Prefer facts from the
  // latest allowed checkpoint so an earlier "unknown" statement is replaced,
  // never supplemented with a future alias.
  if (asksIdentity) {
    const newestOrdinal = Math.max(...scored.map(row => row.item.earliestOrdinal))
    return scored.filter(row => row.item.earliestOrdinal === newestOrdinal).slice(0, 3).map(row => row.item)
  }

  return scored.slice(0, 6).map(row => row.item)
}

export function buildExtractiveAnswer(
  question: string,
  allowedEvidence: EvidenceRecord[],
  options: { characterKey?: string | null } = {},
): GroundedAnswer {
  const candidates = rankEvidenceCandidates(question, allowedEvidence, options)
  if (candidates.length === 0) return insufficientAnswer()

  const selected = candidates.slice(0, 3)
  return answerFromSelectedEvidence(selected, 'extractive')
}

export function answerFromSelectedEvidence(
  selected: EvidenceRecord[],
  method: 'extractive' | 'model-selected',
  metadata: Partial<Omit<GroundedAnswer, 'status' | 'text' | 'evidenceIds' | 'references' | 'method'>> = {},
): GroundedAnswer {
  if (selected.length === 0) return insufficientAnswer()
  return {
    status: 'supported',
    text: selected.map(item => item.text).join(' '),
    evidenceIds: selected.map(item => item.id),
    references: selected.map(toReference),
    method,
    ...metadata,
  }
}

export function insufficientAnswer(): GroundedAnswer {
  return {
    status: 'insufficient',
    text: INSUFFICIENT_MATERIAL_MESSAGE,
    evidenceIds: [],
    references: [],
    method: 'extractive',
  }
}

function toReference(item: EvidenceRecord): EvidenceReference {
  return {
    id: item.id,
    sourceLabel: item.sourceLabel,
    sourceRef: item.sourceRef,
    excerpt: item.sourceExcerpt,
    earliestCheckpoint: item.earliestCheckpointLabel,
  }
}
