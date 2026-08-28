import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parseTasteImport } from '@/services/imports/parser'
import { matchTasteItems } from '@/services/imports/matcher'
import type { TasteImportPayload, TasteImportSource } from '@/services/imports/types'

export const maxDuration = 60

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const form = await req.formData()
    const file = form.get('file')
    const requested = form.get('source')
    const source = requested === 'letterboxd' || requested === 'imdb'
      ? requested as TasteImportSource
      : undefined

    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a CSV or ZIP file.' }, { status: 400 })
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Files must be between 1 byte and 10 MB.' }, { status: 400 })
    }
    if (!/\.(?:csv|zip)$/i.test(file.name)) {
      return NextResponse.json({ error: 'Only CSV and ZIP files are supported.' }, { status: 400 })
    }

    const parsed = await parseTasteImport(Buffer.from(await file.arrayBuffer()), file.name, source)
    const items = await matchTasteItems(parsed.items)
    const ids = items.flatMap(item => item.candidates.map(candidate => candidate.tmdbId))
    const [ratings, watchlist] = await Promise.all([
      prisma.movieRating.findMany({ where: { userId: session.user.id, tmdbId: { in: ids } }, select: { tmdbId: true } }),
      prisma.watchlistItem.findMany({ where: { userId: session.user.id, tmdbId: { in: ids } }, select: { tmdbId: true } }),
    ])
    const ratingIds = new Set(ratings.map(item => item.tmdbId))
    const watchlistIds = new Set(watchlist.map(item => item.tmdbId))
    const withExisting = items.map(item => {
      const selectedId = item.selectedTmdbId ?? item.candidates[0]?.tmdbId
      return {
        ...item,
        existing: {
          rating: selectedId ? ratingIds.has(selectedId) : false,
          watchlist: selectedId ? watchlistIds.has(selectedId) : false,
        },
      }
    })
    const matchedRows = withExisting.filter(item => item.status === 'matched').length
    const conflictRows = withExisting.filter(item => item.status === 'conflict').length
    const unmatchedRows = withExisting.filter(item => item.status === 'unmatched').length
    const payload: TasteImportPayload = { version: 1, items: withExisting }

    const batch = await prisma.importBatch.create({
      data: {
        userId: session.user.id,
        source: parsed.source,
        fileName: file.name.slice(0, 255),
        totalRows: parsed.totalRows,
        matchedRows,
        conflictRows,
        unmatchedRows,
        payload: payload as any,
      },
    })

    return NextResponse.json({
      batchId: batch.id,
      source: parsed.source,
      fileName: batch.fileName,
      totalRows: parsed.totalRows,
      matchedRows,
      conflictRows,
      unmatchedRows,
      items: withExisting,
    })
  } catch (error) {
    console.error('[taste-import/preview]', error)
    const message = error instanceof Error ? error.message : 'Could not read this import.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
