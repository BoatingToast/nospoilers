import { NextResponse } from 'next/server'
import { requireProMember } from '@/lib/pro-session'
import { enforceRateLimit } from '@/lib/rate-limit'
import { isFacetId } from '@/lib/taste/engine'
import {
  extractPreferences,
  templateHypothesis,
  templateQuestion,
  type HypothesisSpec,
  type QuestionSpec,
} from '@/lib/taste/language'
import { readCorrection, tasteAiConfigured, wordHypotheses, wordQuestion } from '@/services/taste-llm'

export const runtime = 'nodejs'

const PRIVATE = { 'Cache-Control': 'private, no-store' }
const HYPOTHESIS_KINDS = ['driver', 'condition', 'aversion', 'hunch']

function cleanTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const title = value.replace(/[\r\n"“”]/g, ' ').replace(/\s+/g, ' ').trim()
  return title && title.length <= 120 ? title : null
}

function parseQuestion(value: unknown): QuestionSpec | null {
  const raw = (value ?? {}) as Record<string, unknown>
  if (raw.kind !== 'contrast' && raw.kind !== 'tiebreak') return null
  if (!isFacetId(raw.facetA) || !isFacetId(raw.facetB) || raw.facetA === raw.facetB) return null
  if (!Array.isArray(raw.titles)) return null
  const titles = raw.titles.map(cleanTitle)
  if (titles.length !== (raw.kind === 'tiebreak' ? 2 : 1) || titles.some(title => title === null)) return null
  return { kind: raw.kind, titles: titles as string[], facetA: raw.facetA, facetB: raw.facetB }
}

function parseHypotheses(value: unknown): HypothesisSpec[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 3) return null
  const specs: HypothesisSpec[] = []
  for (const entry of value) {
    const raw = (entry ?? {}) as Record<string, unknown>
    if (typeof raw.key !== 'string' || raw.key.length > 60) return null
    if (typeof raw.kind !== 'string' || !HYPOTHESIS_KINDS.includes(raw.kind)) return null
    if (!isFacetId(raw.facet)) return null
    if (raw.other !== null && raw.other !== undefined && !isFacetId(raw.other)) return null
    specs.push({
      key: raw.key,
      kind: raw.kind as HypothesisSpec['kind'],
      facet: raw.facet,
      other: isFacetId(raw.other) ? raw.other : null,
    })
  }
  return specs
}

// POST /api/pro/taste-reasons/assist
// Wording and free-text reading. Structure in, validated language out. The
// `source` field says whether a live model or the built-in wording produced it.
export async function POST(request: Request) {
  const member = await requireProMember()
  if ('denied' in member) return member.denied

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400, headers: PRIVATE })

  // The live model is budgeted per member. Built-in wording costs nothing, so
  // a member who runs out still gets a working experience.
  const live = tasteAiConfigured() && !(await enforceRateLimit(request, {
    scope: 'pro-taste-assist',
    limit: 40,
    windowMs: 10 * 60 * 1_000,
    identifier: `user:${member.userId}`,
  }))

  if (body.kind === 'question') {
    const spec = parseQuestion(body.question)
    if (!spec) return NextResponse.json({ message: 'Invalid question.' }, { status: 400, headers: PRIVATE })
    const result = live ? await wordQuestion(spec) : { worded: templateQuestion(spec), source: 'fixture' as const }
    return NextResponse.json(result, { headers: PRIVATE })
  }

  if (body.kind === 'hypotheses') {
    const specs = parseHypotheses(body.hypotheses)
    if (!specs) return NextResponse.json({ message: 'Invalid hypotheses.' }, { status: 400, headers: PRIVATE })
    const result = live
      ? await wordHypotheses(specs)
      : { items: specs.map(spec => ({ key: spec.key, text: templateHypothesis(spec) })), source: 'fixture' as const }
    return NextResponse.json(result, { headers: PRIVATE })
  }

  if (body.kind === 'correction') {
    const text = typeof body.text === 'string' ? body.text.replace(/\s+/g, ' ').trim() : ''
    if (text.length < 3 || text.length > 400) {
      return NextResponse.json({ message: 'Write a short sentence about what you liked or did not.' }, { status: 400, headers: PRIVATE })
    }
    const result = live ? await readCorrection(text) : { extractions: extractPreferences(text), source: 'fixture' as const }
    return NextResponse.json(result, { headers: PRIVATE })
  }

  return NextResponse.json({ message: 'Unknown request.' }, { status: 400, headers: PRIVATE })
}
