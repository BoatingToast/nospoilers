import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { commitTasteImport } from '@/services/imports/commit'

export const maxDuration = 60

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const batchId = typeof body.batchId === 'string' ? body.batchId : ''
    const selections = Array.isArray(body.selections)
      ? body.selections
          .filter((selection: unknown): selection is { rowKey: string; tmdbId: number } => {
            if (!selection || typeof selection !== 'object') return false
            const value = selection as Record<string, unknown>
            return typeof value.rowKey === 'string' && Number.isInteger(value.tmdbId) && Number(value.tmdbId) > 0
          })
          .slice(0, 500)
      : []
    if (!batchId || selections.length === 0) {
      return NextResponse.json({ error: 'Choose at least one movie to import.' }, { status: 400 })
    }

    const result = await commitTasteImport(session.user.id, batchId, selections)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[taste-import/commit]', error)
    const message = error instanceof Error ? error.message : 'Import failed.'
    const status = message.includes('already been completed') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
