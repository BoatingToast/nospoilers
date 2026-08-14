import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ tmdbId: string; messageId: string }> }

/**
 * An explicit POST keeps locked text out of feed payloads, caches, previews,
 * and page source while preserving the viewer's deliberate "Reveal anyway"
 * action. Spoiler content is not an authorization boundary.
 */
export async function POST(_req: Request, { params }: Params) {
  const { tmdbId: rawTmdbId, messageId } = await params
  const tmdbId = Number.parseInt(rawTmdbId, 10)
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: 'Invalid movie' }, { status: 400 })
  }

  const message = await prisma.spoilerZoneMessage.findFirst({
    where: { id: messageId, tmdbId, isDeleted: false },
    select: { content: true },
  })
  if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

  return NextResponse.json(message, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}
