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
    const message = error instanceof Error ? error.message : ''

    if (message.includes('already been completed')) {
      return NextResponse.json({ error: 'This import has already been completed.' }, { status: 409 })
    }
    if (message === 'Import preview not found.' ||
        message === 'Import preview has expired.' ||
        message === 'Select at least one matched movie to import.') {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // Do not expose Prisma queries or database schema details in the UI.
    return NextResponse.json(
      { error: 'We couldn’t import those movies right now. Please try again.' },
      { status: 500 },
    )
  }
}
