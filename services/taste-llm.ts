import { FACET_IDS, type PreferenceExtraction } from '@/lib/taste/engine'
import {
  FACET_COPY,
  extractPreferences,
  templateHypothesis,
  templateQuestion,
  validateExtractions,
  validateWordedHypothesis,
  validateWordedQuestion,
  type HypothesisSpec,
  type QuestionSpec,
  type WordedQuestion,
} from '@/lib/taste/language'

/**
 * Language model calls for Taste Lab. The model only words questions and
 * hypotheses and reads free-text corrections; it never chooses films or scores.
 * Every response is validated, and anything unusable falls back to the
 * deterministic wording in lib/taste/language.ts.
 *
 * Uses the same provider, key and model as Lumi (app/api/pro/concierge).
 */

const MODEL = 'gpt-4o-mini'

export type WordingSource = 'live' | 'fixture'

const RULES = `You help a film app talk with a member about why they like the films they like.

Hard rules:
- Never mention plot events, twists, endings, character fates, surprise appearances, or anything that happens in a film. Do not hint that a film has a twist or a surprise.
- Describe films only through qualities such as relationships, ideas, atmosphere, pace, tension, intensity, humor, realism and scale.
- Statements are about what the member enjoys in films. Never infer anything about the member as a person: no personality, mental state, beliefs, background, identity or life circumstances.
- No percentages, scores or probabilities.
- Plain, warm, direct language. No exclamation marks.`

const FACET_GLOSSARY = FACET_IDS
  .map(facet => `${facet}: ${FACET_COPY[facet].option.toLowerCase()}`)
  .join('\n')

export function tasteAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

interface ResponsesPayload {
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
}

async function callModel(input: string, name: string, schema: Record<string, unknown>): Promise<unknown | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        instructions: RULES,
        input,
        max_output_tokens: 400,
        store: false,
        text: { format: { type: 'json_schema', name, strict: true, schema } },
      }),
      signal: AbortSignal.timeout(12_000),
    })
    if (!response.ok) {
      console.error('[taste-llm] request failed', response.status, response.headers.get('x-request-id'))
      return null
    }
    const payload = await response.json() as ResponsesPayload
    const text = payload.output
      ?.flatMap(item => item.content ?? [])
      .filter(content => content.type === 'output_text' && typeof content.text === 'string')
      .map(content => content.text)
      .join('') ?? ''
    return text ? JSON.parse(text) : null
  } catch (error) {
    console.error('[taste-llm]', error)
    return null
  }
}

export async function wordQuestion(spec: QuestionSpec): Promise<{ worded: WordedQuestion; source: WordingSource }> {
  const fallback = templateQuestion(spec)
  const raw = await callModel(
    [
      spec.kind === 'tiebreak'
        ? `The member rated both "${spec.titles[0]}" and "${spec.titles[1]}" highly. Write one short question asking which they would rather watch again tonight.`
        : `The member loved "${spec.titles[0]}" and has confirmed they watched it. Write one short question asking what made it work for them, with two answer options.`,
      `Option A is about: ${FACET_COPY[spec.facetA].option}.`,
      `Option B is about: ${FACET_COPY[spec.facetB].option}.`,
      spec.kind === 'tiebreak'
        ? 'Return the two film titles as the options, unchanged.'
        : `Each option is a short phrase of at most twelve words describing that quality. Use the title "${spec.titles[0]}" exactly in the question.`,
    ].join('\n'),
    'taste_question',
    {
      type: 'object',
      additionalProperties: false,
      required: ['prompt', 'optionA', 'optionB'],
      properties: {
        prompt: { type: 'string' },
        optionA: { type: 'string' },
        optionB: { type: 'string' },
      },
    },
  )
  const worded = validateWordedQuestion(raw, spec)
  return worded ? { worded, source: 'live' } : { worded: fallback, source: 'fixture' }
}

export async function wordHypotheses(
  specs: HypothesisSpec[],
): Promise<{ items: Array<{ key: string; text: string }>; source: WordingSource }> {
  const fallback = specs.map(spec => ({ key: spec.key, text: templateHypothesis(spec) }))
  if (specs.length === 0) return { items: fallback, source: 'fixture' }

  const raw = await callModel(
    [
      'Rewrite each statement about what the member enjoys in films as one natural sentence.',
      'Keep the meaning and keep it tentative ("you seem to", "looks like"). One sentence each, at most 24 words.',
      ...fallback.map((item, index) => `${index + 1}. key=${item.key}: ${item.text}`),
    ].join('\n'),
    'taste_hypotheses',
    {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['key', 'text'],
            properties: { key: { type: 'string' }, text: { type: 'string' } },
          },
        },
      },
    },
  )

  const written = new Map<string, string>()
  const items = (raw as { items?: unknown } | null)?.items
  if (Array.isArray(items)) {
    for (const item of items) {
      const key = (item as { key?: unknown })?.key
      const text = validateWordedHypothesis((item as { text?: unknown })?.text)
      if (typeof key === 'string' && text) written.set(key, text)
    }
  }
  // Each sentence is accepted or replaced on its own merits.
  return {
    items: fallback.map(item => ({ key: item.key, text: written.get(item.key) ?? item.text })),
    source: written.size > 0 ? 'live' : 'fixture',
  }
}

export async function readCorrection(
  text: string,
): Promise<{ extractions: PreferenceExtraction[]; source: WordingSource }> {
  const raw = await callModel(
    [
      'A member corrected our reading of their film taste. Extract which qualities they want more or less of.',
      'Qualities:',
      FACET_GLOSSARY,
      'For each quality they clearly speak to, return its id, the direction ("more" if they like or want it, "less" if they dislike or want less of it), a strength ("clear" or "strong"), and a short quote copied exactly from their text.',
      'If they say to keep something the same, leave it out. Return an empty list if nothing is clear.',
      `Member text: """${text}"""`,
    ].join('\n'),
    'taste_correction',
    {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['facet', 'direction', 'strength', 'quote'],
            properties: {
              facet: { type: 'string', enum: [...FACET_IDS] },
              direction: { type: 'string', enum: ['more', 'less'] },
              strength: { type: 'string', enum: ['clear', 'strong'] },
              quote: { type: 'string' },
            },
          },
        },
      },
    },
  )

  const extractions = validateExtractions((raw as { items?: unknown } | null)?.items, text, FACET_IDS)
  if (extractions.length > 0) return { extractions, source: 'live' }
  return { extractions: extractPreferences(text), source: 'fixture' }
}
