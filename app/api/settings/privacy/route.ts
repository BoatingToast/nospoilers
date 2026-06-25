import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const VALID = ['public', 'friends', 'private'] as const
type Visibility = typeof VALID[number]

function isValid(v: unknown): v is Visibility {
  return typeof v === 'string' && VALID.includes(v as Visibility)
}

// GET /api/settings/privacy
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const privacy = await prisma.userPrivacy.findUnique({ where: { userId: session.user.id } })
  return NextResponse.json(privacy ?? {
    ratings: 'public', watchlist: 'public', collections: 'public', activity: 'friends',
  })
}

// PUT /api/settings/privacy
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { ratings, watchlist, collections, activity } = body

  if (!isValid(ratings) || !isValid(watchlist) || !isValid(collections) || !isValid(activity)) {
    return NextResponse.json({ error: 'Invalid visibility value' }, { status: 400 })
  }

  const updated = await prisma.userPrivacy.upsert({
    where:  { userId: session.user.id },
    create: { userId: session.user.id, ratings, watchlist, collections, activity },
    update: { ratings, watchlist, collections, activity, updatedAt: new Date() },
  })

  return NextResponse.json(updated)
}
