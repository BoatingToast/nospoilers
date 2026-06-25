import { NextRequest, NextResponse }  from 'next/server'
import { getToken }                    from 'next-auth/jwt'
import { findSimilarUsers }            from '@/services/compatibility'
import { getPersonalityBySlug }        from '@/services/personality'

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) return NextResponse.json([], { status: 200 })  // unauthenticated → empty list (not an error)

  try {
    const similar = await findSimilarUsers(token.id as string, 6)
    const hydrated = similar.map(u => ({
      ...u,
      personality: u.personality?.slug ? getPersonalityBySlug(u.personality.slug) : null,
    }))
    return NextResponse.json(hydrated)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
