import { NextRequest, NextResponse }                         from 'next/server'
import { getToken }                                          from 'next-auth/jwt'
import { getCollection, updateCollection, deleteCollection } from '@/services/collections'
import { AUTH_SECRET }                                       from '@/lib/auth-secret'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params
  const col = await getCollection(id)
  if (!col) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(col)
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const token = await getToken({ req, secret: AUTH_SECRET })
  const uid   = (token?.id ?? token?.sub) as string | undefined
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
  const token = await getToken({ req, secret: AUTH_SECRET })
  const uid   = (token?.id ?? token?.sub) as string | undefined
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    await deleteCollection(uid, id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 403 })
  }
}
