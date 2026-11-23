import {
  audienceApiError,
  audienceBody,
  audienceJson,
  audienceMutation,
  audienceUser,
} from '@/lib/audience-api'
import { recordEvent } from '@/services/audience-engine'

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const user = await audienceUser()
    const limited = await audienceMutation(request, user.id, 'events', 90)
    if (limited) return limited
    return audienceJson(
      await recordEvent((await params).code, user.id, await audienceBody(request)),
    )
  } catch (error) {
    return audienceApiError(error)
  }
}
