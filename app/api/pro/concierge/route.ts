import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasProAccess } from '@/lib/pro-access'
import { enforceRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

type MessageRole = 'assistant' | 'user'

interface IncomingMessage {
  role: MessageRole
  content: string
}

interface ConciergeBody {
  messages?: IncomingMessage[]
  context?: {
    avatarName?: string
    silhouette?: string
    energy?: string
    watchProgress?: number
  }
}

interface OpenAIResponse {
  output?: Array<{
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
}

const SYSTEM_INSTRUCTIONS = `You are Lumi, the NoSpoilers Pro cinema companion.

Your job is to reduce decision fatigue and make one confident, personalized movie-night recommendation. You can reason from mood, runtime, company, genre, craft preferences, the user's ratings, and explicitly supplied context.

Spoiler safety is absolute:
- Never reveal plot events, twists, endings, surprise appearances, character fates, scene descriptions, or trailer-derived story details.
- Describe movies only through spoiler-free qualities such as pace, tone, intensity, visual style, sound, performance style, genre, runtime, and broad craft.
- Do not invent access to the user's account, ratings, watchlist, or history. Use only context present in the conversation.
- If there is not enough information, ask for one useful constraint instead of giving a long questionnaire.
- Prefer one decisive recommendation or one tightly designed double feature over a long list.
- Keep replies warm, concise, and under 130 words unless the user asks for more.`

function sanitizeMessages(messages: unknown): IncomingMessage[] | null {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) return null

  const sanitized: IncomingMessage[] = []
  for (const message of messages) {
    if (!message || typeof message !== 'object') return null
    const candidate = message as Partial<IncomingMessage>
    if ((candidate.role !== 'assistant' && candidate.role !== 'user') || typeof candidate.content !== 'string') return null
    const content = candidate.content.trim()
    if (!content || content.length > 1_200) return null
    sanitized.push({ role: candidate.role, content })
  }
  return sanitized.slice(-12)
}

function extractOutputText(response: OpenAIResponse): string {
  return response.output
    ?.flatMap(item => item.content ?? [])
    .filter(content => content.type === 'output_text' && typeof content.text === 'string')
    .map(content => content.text?.trim())
    .filter((content): content is string => Boolean(content))
    .join('\n') ?? ''
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !hasProAccess(session.user.email)) {
    return NextResponse.json(
      { code: 'PRO_REQUIRED', message: 'NoSpoilers Pro preview access is required.' },
      { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  return NextResponse.json(
    {
      configured: Boolean(process.env.OPENAI_API_KEY),
      model: 'gpt-4o-mini',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !hasProAccess(session.user.email)) {
    return NextResponse.json(
      {
        code: 'PRO_REQUIRED',
        message: 'Live Lumi replies require NoSpoilers Pro access.',
      },
      { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  const rateLimited = await enforceRateLimit(request, {
    scope: 'pro-concierge',
    limit: 16,
    windowMs: 10 * 60 * 1_000,
    identifier: `user:${session.user.id}`,
  })
  if (rateLimited) return rateLimited

  let body: ConciergeBody
  try {
    body = await request.json() as ConciergeBody
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 })
  }

  const messages = sanitizeMessages(body.messages)
  if (!messages) {
    return NextResponse.json({ message: 'Provide between 1 and 20 valid messages.' }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        code: 'AI_NOT_CONFIGURED',
        message: 'Live Lumi replies are ready to activate when OPENAI_API_KEY is configured.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const context = body.context ?? {}
  const safeProgress = Number.isFinite(context.watchProgress)
    ? Math.max(0, Math.min(100, Number(context.watchProgress)))
    : undefined
  const contextLine = [
    context.avatarName ? `Taste-twin name: ${String(context.avatarName).slice(0, 24)}` : null,
    context.silhouette ? `Identity style: ${String(context.silhouette).slice(0, 24)}` : null,
    context.energy ? `Current energy: ${String(context.energy).slice(0, 24)}` : null,
    safeProgress !== undefined ? `Current story-progress boundary: ${safeProgress}%` : null,
  ].filter(Boolean).join('. ')

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        instructions: `${SYSTEM_INSTRUCTIONS}${contextLine ? `\n\nCurrent non-plot context: ${contextLine}.` : ''}`,
        input: messages,
        max_output_tokens: 320,
        store: false,
      }),
      signal: AbortSignal.timeout(20_000),
    })

    if (!response.ok) {
      const requestId = response.headers.get('x-request-id')
      console.error('[pro/concierge] OpenAI request failed', response.status, requestId)
      return NextResponse.json(
        { message: 'Lumi is temporarily unavailable. Please try again.' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const result = await response.json() as OpenAIResponse
    const message = extractOutputText(result)
    if (!message) {
      return NextResponse.json(
        { message: 'Lumi returned an empty response. Please try again.' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return NextResponse.json(
      { message, model: 'gpt-4o-mini' },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    console.error('[pro/concierge]', error)
    return NextResponse.json(
      { message: 'Lumi is temporarily unavailable. Please try again.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
