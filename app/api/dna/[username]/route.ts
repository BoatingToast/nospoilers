import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getMovieDnaProfile } from '@/services/dna'

// GET /api/dna/[username] — the reusable Movie DNA bundle for any user,
// for client components that don't already have it from a server fetch
// (friend profile tabs, recommendation widgets, etc).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params

  const user = await prisma.user.findUnique({
    where:  { username },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Whether DNA exists is determined entirely by getMovieDnaProfile (i.e.
  // whether a TasteProfile row exists) — not by onboarding completion.
  // A user can now have real DNA from ratings/Top 5 alone, without ever
  // finishing onboarding, so gating on that flag here would hide it again.
  const profile = await getMovieDnaProfile(user.id)

  return NextResponse.json(profile, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } })
}
