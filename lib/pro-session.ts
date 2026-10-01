import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasProAccess } from '@/lib/pro-access'

/** The signed-in Pro member's id, or the response to send instead. */
export async function requireProMember(): Promise<{ userId: string } | { denied: NextResponse }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !hasProAccess(session.user.email)) {
    return {
      denied: NextResponse.json(
        { code: 'PRO_REQUIRED', message: 'NoSpoilers Pro preview access is required.' },
        { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
      ),
    }
  }
  return { userId: session.user.id }
}
