import type {
  AnswerChoice,
  EvidenceSource,
  FacetId,
  HypothesisKind,
  PickRole,
  PreferenceExtraction,
  QuestionKind,
} from './engine'

/**
 * Words for the taste engine: facet vocabulary, deterministic wording used when
 * live AI is unavailable, a rule-based reader for free-text corrections, and the
 * checks every piece of model-written text must pass before a member sees it.
 */

interface FacetCopy {
  label: string
  /** Fits "You come for ___" and "___ work(s) against a film". */
  noun: string
  plural: boolean
  /** An answer option: what about the film might have been the reason. */
  option: string
  more: string
  less: string
}

export const FACET_COPY: Record<FacetId, FacetCopy> = {
  relationships: {
    label: 'Relationships', noun: 'the relationships', plural: true,
    option: 'The people and how they relate to each other',
    more: 'More about the relationships', less: 'Less sentimental',
  },
  ideas: {
    label: 'Ideas', noun: 'big ideas', plural: true,
    option: 'The concepts and how it thinks them through',
    more: 'Headier ideas', less: 'Less explaining',
  },
  atmosphere: {
    label: 'Atmosphere', noun: 'atmosphere', plural: false,
    option: 'The mood and the world it builds',
    more: 'More atmosphere', less: 'Less of a mood piece',
  },
  momentum: {
    label: 'Momentum', noun: 'a fast pace', plural: false,
    option: 'How quickly it moves',
    more: 'Faster pacing', less: 'Slower burn',
  },
  tension: {
    label: 'Tension', noun: 'sustained tension', plural: false,
    option: 'The suspense it holds',
    more: 'More suspense', less: 'Less nerve-racking',
  },
  intensity: {
    label: 'Dark intensity', noun: 'dark intensity', plural: false,
    option: 'How dark and intense it gets',
    more: 'Darker', less: 'Less disturbing',
  },
  humor: {
    label: 'Humor', noun: 'humor', plural: false,
    option: 'How funny or light it is',
    more: 'Funnier', less: 'More serious',
  },
  grounding: {
    label: 'Real-world grounding', noun: 'real-world grounding', plural: false,
    option: 'How real and grounded it feels',
    more: 'More grounded', less: 'More escapist',
  },
  spectacle: {
    label: 'Spectacle', noun: 'scale and spectacle', plural: false,
    option: 'The scale and the set pieces',
    more: 'Bigger spectacle', less: 'Smaller scale',
  },
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** A plain-language reading of a belief mean. Deliberately not a number. */
export function describeLean(mean: number): string {
  if (mean >= 0.35) return 'a main draw'
  if (mean >= 0.12) return 'a plus'
  if (mean > -0.12) return 'neutral'
  if (mean > -0.35) return 'a slight minus'
  return 'works against it'
}

export function sourceLabel(source: EvidenceSource | 'ratings'): string {
  if (source === 'ratings') return 'your ratings'
  if (source === 'answer') return 'your answers'
  if (source === 'hypothesis') return 'your feedback'
  if (source === 'correction') return 'your correction'
  return 'your temporary change'
}

// ─── Deterministic wording ────────────────────────────────────────────────────

export interface WordedQuestion {
  prompt: string
  context: string | null
  optionA: string
  optionB: string
}

export interface QuestionSpec {
  kind: QuestionKind
  titles: string[]
  facetA: FacetId
  facetB: FacetId
}

export function templateQuestion(spec: QuestionSpec): WordedQuestion {
  if (spec.kind === 'tiebreak') {
    return {
      prompt: 'You rated both highly. Which would you rather watch again tonight?',
      context: `${spec.titles[0]} leans on ${FACET_COPY[spec.facetA].noun}; ${spec.titles[1]} leans on ${FACET_COPY[spec.facetB].noun}.`,
      optionA: spec.titles[0],
      optionB: spec.titles[1],
    }
  }
  return {
    prompt: `What made ${spec.titles[0]} work for you?`,
    context: null,
    optionA: FACET_COPY[spec.facetA].option,
    optionB: FACET_COPY[spec.facetB].option,
  }
}

export interface HypothesisSpec {
  key: string
  kind: HypothesisKind
  facet: FacetId
  other: FacetId | null
}

export function templateHypothesis(spec: HypothesisSpec): string {
  const main = FACET_COPY[spec.facet]
  if (spec.kind === 'condition' && spec.other) {
    const other = FACET_COPY[spec.other]
    return `You seem to enjoy ${other.noun} most when ${main.noun} ${main.plural ? 'stay' : 'stays'} central.`
  }
  if (spec.kind === 'aversion') {
    return `${capitalize(main.noun)} ${main.plural ? 'tend' : 'tends'} to work against a film for you.`
  }
  if (spec.kind === 'hunch') {
    return `${capitalize(main.noun)} may matter to you more than your ratings show.`
  }
  return `${capitalize(main.noun)} ${main.plural ? 'look' : 'looks'} like a main thing you come for.`
}

/** The provenance note attached to evidence created by an answer. */
export function answerNotes(spec: QuestionSpec, choice: AnswerChoice) {
  const a = FACET_COPY[spec.facetA].label.toLowerCase()
  const b = FACET_COPY[spec.facetB].label.toLowerCase()
  const where = spec.kind === 'tiebreak'
    ? `between ${spec.titles[0]} and ${spec.titles[1]}`
    : `for ${spec.titles[0]}`
  const chosen = choice === 'b' ? b : a
  const passed = choice === 'b' ? a : b
  return {
    chosen: `You chose ${chosen} over ${passed} ${where}`,
    passed: `You chose ${chosen} over ${passed} ${where}`,
    both: `You said both ${a} and ${b} mattered ${where}`,
    neither: `You said neither ${a} nor ${b} was the reason ${where}`,
  }
}

export const ROLE_COPY: Record<PickRole, { label: string; line: string }> = {
  close: { label: 'Close match', line: 'Closest to what you already love.' },
  adjacent: { label: 'Adjacent discovery', line: 'Your reasons, in a lane you have not rated much.' },
  stretch: { label: 'Deliberate stretch', line: 'Keeps your main draw and changes something on purpose.' },
}

export function reasonSentence(facet: FacetId, because: EvidenceSource | 'ratings', tentative: boolean): string {
  const noun = FACET_COPY[facet].noun
  const origin = because === 'ratings'
    ? `which ${tentative ? 'your ratings hint' : 'your ratings suggest'} you value`
    : because === 'tweak'
      ? 'which you asked for just now'
      : `which ${sourceLabel(because)} put near the top`
  return `Strong on ${noun}, ${origin}.`
}

export function tradeoffSentence(facet: FacetId, direction: 'more' | 'less', role: PickRole): string {
  const noun = FACET_COPY[facet].noun
  const lead = role === 'stretch' ? 'The stretch' : 'The tradeoff'
  return `${lead}: ${direction} of ${noun} than the films you rate highest.`
}

export function matchedSentence(matched: number, of: number): string {
  if (of === 0) return 'Not enough stated reasons to count against yet.'
  return `Has ${matched} of your ${of} strongest ${of === 1 ? 'reason' : 'reasons'}.`
}

// ─── Reading a free-text correction without a model ──────────────────────────

/**
 * `points` is the direction the word itself points along the facet. "Slow"
 * points down the momentum axis, so "too slow" asks for more momentum.
 */
const LEXICON: Array<{ pattern: RegExp; facet: FacetId; points: 1 | -1 }> = [
  { pattern: /\b(relationships?|characters?|family|romance|love story|emotional|emotions?|heart|bonds?|people)\b/, facet: 'relationships', points: 1 },
  { pattern: /\b(sentimental|sappy|melodrama(tic)?)\b/, facet: 'relationships', points: 1 },
  { pattern: /\b(ideas?|concepts?|science|exposition|technical|philosoph\w*|cerebral|heady|smart|thought[- ]provoking|explain\w*)\b/, facet: 'ideas', points: 1 },
  { pattern: /\b(atmosphere|atmospheric|mood|moody|vibes?|world[- ]?building|visuals?|cinematography|setting|aesthetic|style|look)\b/, facet: 'atmosphere', points: 1 },
  { pattern: /\b(fast(er)?|quick(er)?|momentum|propulsive|energy|energetic|action[- ]packed|tight(er)?)\b/, facet: 'momentum', points: 1 },
  { pattern: /\b(slow(er)?|dragged|drags|plodding|long[- ]winded|meandering)\b/, facet: 'momentum', points: -1 },
  { pattern: /\b(tension|tense|suspense(ful)?|thrills?|stressful|nerve[- ]racking|edge of my seat)\b/, facet: 'tension', points: 1 },
  { pattern: /\b(violen(ce|t)|gore|gory|disturbing|dark(er|ness)?|bleak|brutal(ity)?|grim|heavy|upsetting|scary)\b/, facet: 'intensity', points: 1 },
  { pattern: /\b(humou?r|funny|funnier|jokes?|comedy|comedic|laughs?|light(er|ness)?|playful)\b/, facet: 'humor', points: 1 },
  { pattern: /\b(serious|humou?rless|dour)\b/, facet: 'humor', points: -1 },
  { pattern: /\b(realis(m|tic)|grounded|true stor(y|ies)|believable|real[- ]world|authentic)\b/, facet: 'grounding', points: 1 },
  { pattern: /\b(escapis(m|t)|fantastical|far[- ]fetched)\b/, facet: 'grounding', points: -1 },
  { pattern: /\b(spectacle|scale|set[- ]pieces?|effects|epic|explosions?|big|bigger|blockbuster)\b/, facet: 'spectacle', points: 1 },
  { pattern: /\b(small(er)?|intimate|quiet(er)?|low[- ]key)\b/, facet: 'spectacle', points: -1 },
]

// Includes complaint words: "the science dragged" rejects the science and the pace.
const REJECTS = /\b(not|n't|never|no|without|less|fewer|hate[ds]?|dislike[ds]?|too|tired of|sick of|minus|rather than|instead of|despite|bored|boring|tedious|put off by|dragged|drags|plodding|long[- ]winded|meandering)\b/
const KEEPS = /\b(same|keep|kept|still)\b/
const EMPHASIS = /\b(really|very|absolutely|hate[ds]?|love[ds]?|never|always|by far)\b/
/** Words that already carry direction, so "more"/"less" should not flip them twice. */
const COMPARATIVE = /\b(faster|slower|quicker|darker|lighter|funnier|bigger|smaller|quieter|tighter)\b/

/**
 * A small rule-based reader used whenever live extraction is unavailable or
 * returns something unusable. It reads clause by clause: each clause either
 * wants what it names or rejects it.
 */
export function extractPreferences(text: string): PreferenceExtraction[] {
  const clauses = text
    .replace(/[“”]/g, '"')
    .split(/[,;.!?\n]|\bbut\b|\bthough\b|\balthough\b/i)
    .map(clause => clause.trim())
    .filter(Boolean)

  const found = new Map<FacetId, PreferenceExtraction>()
  for (const clause of clauses) {
    const lower = clause.toLowerCase().replace(/’/g, "'")
    // "Same emotional depth" asks for no change.
    if (KEEPS.test(lower) && !REJECTS.test(lower)) continue

    for (const entry of LEXICON) {
      if (!entry.pattern.test(lower)) continue
      const comparative = COMPARATIVE.test(lower)
      const rejects = REJECTS.test(lower) && !comparative
      const direction = (entry.points * (rejects ? -1 : 1)) as 1 | -1
      found.set(entry.facet, {
        facet: entry.facet,
        direction,
        strength: EMPHASIS.test(lower) ? 'strong' : 'clear',
        quote: clause.slice(0, 120),
      })
    }
  }
  return [...found.values()]
}

// ─── Guards on model-written text ─────────────────────────────────────────────

const SPOILER_LANGUAGE = /\b(twists?|endings?|finale|final (scene|act)|dies|died|death|killed|killer|murderer|reveal(s|ed)?|turns? out|secret identity|betray(s|al)?|surprise|cameo|post[- ]?credits|spoilers?|the truth about|who (did|is behind))\b/i

/**
 * Taste statements describe films, never the person. Anything that reads a
 * member's mental health, beliefs, identity, or circumstances into their
 * ratings is rejected.
 */
const SENSITIVE_INFERENCE = /\b(depress\w*|anxi\w*|trauma\w*|mental|therap\w*|lonel\w*|griev\w*|religio\w*|spiritual\w*|politic\w*|liberal|conservative|sexual\w*|gay|lesbian|queer|straight|gender|masculin\w*|feminin\w*|race|racial|ethnic\w*|disorder|autis\w*|adhd|neuro\w*|childhood|upbringing|your (parents|father|mother|marriage|divorce|income|age|job)|introvert\w*|extrovert\w*|personality|you are (a|an)|you're (a|an))\b/i

const FAKE_PRECISION = /\d+(\.\d+)?\s?%|\b\d+(\.\d+)?\s?(out of|\/)\s?\d+\b|\bprobabilit\w*|\bconfidence score\b/i

function withoutTitles(text: string, titles: string[]): string {
  // A title such as "Kill Bill" is not spoiler language, so it is removed first.
  return titles.reduce((result, title) => (title ? result.split(title).join(' ') : result), text)
}

export function hasSpoilerLanguage(text: string, titles: string[] = []): boolean {
  return SPOILER_LANGUAGE.test(withoutTitles(text, titles))
}

export function isSafeTasteText(text: string, titles: string[] = []): boolean {
  const body = withoutTitles(text, titles)
  return !SPOILER_LANGUAGE.test(body) && !SENSITIVE_INFERENCE.test(body) && !FAKE_PRECISION.test(body)
}

function cleanLine(value: unknown, limit: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length >= 4 && text.length <= limit ? text : null
}

/** Accept model wording for a question only if it is safe and still about the same films. */
export function validateWordedQuestion(value: unknown, spec: QuestionSpec): WordedQuestion | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const prompt = cleanLine(raw.prompt, 160)
  const optionA = cleanLine(raw.optionA, 90)
  const optionB = cleanLine(raw.optionB, 90)
  if (!prompt || !optionA || !optionB || optionA === optionB) return null
  if (![prompt, optionA, optionB].every(text => isSafeTasteText(text, spec.titles))) return null

  if (spec.kind === 'tiebreak') {
    // The options are the two films themselves; a model may not rename them.
    const fallback = templateQuestion(spec)
    return { prompt, context: fallback.context, optionA: fallback.optionA, optionB: fallback.optionB }
  }
  if (!prompt.includes(spec.titles[0])) return null
  return { prompt, context: null, optionA, optionB }
}

export function validateWordedHypothesis(value: unknown): string | null {
  const text = cleanLine(value, 180)
  if (!text || !isSafeTasteText(text)) return null
  return text
}

/**
 * Accept a model's reading of a correction only where it points at a known
 * facet and quotes the member's own words. An extraction that cannot be tied
 * to something the member actually wrote is discarded.
 */
export function validateExtractions(value: unknown, sourceText: string, facetIds: readonly string[]): PreferenceExtraction[] {
  if (!Array.isArray(value)) return []
  const haystack = sourceText.toLowerCase()
  const found = new Map<FacetId, PreferenceExtraction>()

  for (const entry of value.slice(0, 6)) {
    if (!entry || typeof entry !== 'object') continue
    const raw = entry as Record<string, unknown>
    if (typeof raw.facet !== 'string' || !facetIds.includes(raw.facet)) continue
    const direction = raw.direction === 1 || raw.direction === 'more' ? 1
      : raw.direction === -1 || raw.direction === 'less' ? -1
        : null
    if (direction === null) continue
    const quote = cleanLine(raw.quote, 120)
    if (!quote || !haystack.includes(quote.toLowerCase())) continue
    found.set(raw.facet as FacetId, {
      facet: raw.facet as FacetId,
      direction,
      strength: raw.strength === 'strong' ? 'strong' : 'clear',
      quote,
    })
  }
  return [...found.values()]
}
