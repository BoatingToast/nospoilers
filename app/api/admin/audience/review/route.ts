import {
  audienceApiError,
  audienceBody,
  audienceJson,
  audienceMutation,
  audienceUser,
} from '@/lib/audience-api'
import { reviewResponse } from '@/services/audience-engine'

export async function PATCH(request: Request) {
  try {
    const user = await audienceUser(true)
    const limited = await audienceMutation(request, user.id, 'review', 60)
    if (limited) return limited
    return audienceJson(await reviewResponse(user.id, await audienceBody(request)))
  } catch (error) {
    return audienceApiError(error)
  }
}
