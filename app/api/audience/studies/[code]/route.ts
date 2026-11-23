import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { audienceApiError, audienceJson } from '@/lib/audience-api'
import { publicStudy } from '@/services/audience-engine'

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    return audienceJson(await publicStudy((await params).code, session?.user?.id))
  } catch (error) {
    return audienceApiError(error)
  }
}
