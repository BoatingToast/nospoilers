import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ── GET /api/profile/me ───────────────────────────────────────────────────────
// Returns the current user's full editable profile data.

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      id:              true,
      username:        true,
      email:           true,
      avatarUrl:       true,
      displayName:     true,
      bio:             true,
      location:        true,
      favoriteDecade:  true,
      favoriteDirector:true,
      favoriteActor:   true,
      twitterUrl:      true,
      letterboxdUrl:   true,
      instagramUrl:    true,
      preferences:     { select: { genres: true } },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    ...user,
    favoriteGenres: user.preferences?.genres ?? [],
  })
}

// ── PATCH /api/profile/me ─────────────────────────────────────────────────────
// Updates editable profile fields. All fields are optional.

const ALLOWED_FIELDS = [
  'displayName',
  'bio',
  'location',
  'favoriteDecade',
  'favoriteDirector',
  'favoriteActor',
  'twitterUrl',
  'letterboxdUrl',
  'instagramUrl',
] as const

type AllowedField = (typeof ALLOWED_FIELDS)[number]

interface UpdatePayload {
  displayName?:     string | null
  bio?:             string | null
  location?:        string | null
  favoriteDecade?:  string | null
  favoriteDirector?: string | null
  favoriteActor?:   string | null
  twitterUrl?:      string | null
  letterboxdUrl?:   string | null
  instagramUrl?:    string | null
  favoriteGenres?:  string[]
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: UpdatePayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate bio length
  if (body.bio && body.bio.length > 500) {
    return NextResponse.json({ error: 'Bio must be 500 characters or fewer' }, { status: 400 })
  }

  // Build update data — only pick allowed fields that are present in the body
  const data: Partial<Record<AllowedField, string | null>> = {}
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      data[field] = (body[field as keyof UpdatePayload] as string | null | undefined) ?? null
    }
  }

  const userId = session.user.id

  await prisma.$transaction(async tx => {
    // Update user profile fields
    if (Object.keys(data).length > 0) {
      await tx.user.update({ where: { id: userId }, data })
    }

    // Update favorite genres if provided
    if (Array.isArray(body.favoriteGenres)) {
      await tx.userPreferences.upsert({
        where:  { userId },
        update: { genres: body.favoriteGenres },
        create: {
          userId,
          genres:       body.favoriteGenres,
          pacing:       'moderate',
          endings:      'happy',
          storytelling: 'plot',
          tone:         'serious',
          complexity:   5,
          plotTwists:   5,
        },
      })
    }
  })

  return NextResponse.json({ ok: true })
}
