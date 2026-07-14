import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { TasteImportPayload } from '@/services/imports/types'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const batch = await prisma.importBatch.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, status: true, payload: true },
  })
  if (!batch) return NextResponse.json({ error: 'Import not found.' }, { status: 404 })

  const payload = batch.payload as unknown as TasteImportPayload | null
  if (!payload || !Array.isArray(payload.items)) return NextResponse.json({ items: [] })
  const committed = new Map(payload.committedSelections?.map(item => [item.rowKey, item.tmdbId]) ?? [])

  return NextResponse.json({
    items: payload.items.flatMap(item => {
      const selectedId = committed.get(item.rowKey) ?? (batch.status === 'previewed' ? item.selectedTmdbId : null)
      const movie = item.candidates.find(candidate => candidate.tmdbId === selectedId)
      if (batch.status === 'completed' && !movie) return []
      return [{
        rowKey: item.rowKey,
        importedTitle: item.title,
        importedYear: item.year,
        matchedTitle: movie?.title ?? null,
        matchedYear: movie?.year ?? null,
        tmdbId: movie?.tmdbId ?? null,
        status: item.status,
        ratingScore: item.ratingScore,
        watched: item.watched,
        watchlist: item.watchlist,
        hasReview: !!item.review,
      }]
    }),
  })
}
