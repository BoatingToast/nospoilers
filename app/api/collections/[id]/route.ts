import { NextRequest, NextResponse }                         from 'next/server'
import { getServerSession }                                  from 'next-auth'
import { authOptions }                                       from '@/lib/auth'
import { getCollection, updateCollection, deleteCollection } from '@/services/collections'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params
  const col = await getCollection(id)
  if (!col) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(col)
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  const uid     = session?.user?.id as string | undefined
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  try {
    const col = await updateCollection(uid, id, body)
    return NextResponse.json(col)
  } catch {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 403 })
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  const uid     = session?.user?.id as string | undefined
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    await deleteCollection(uid, id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 403 })
  }
}
