import {
  audienceApiError,
  audienceBody,
  audienceJson,
  audienceMutation,
  audienceUser,
} from '@/lib/audience-api'
import { createDataset } from '@/services/audience-engine'

export async function POST(request: Request) {
  try {
    const user = await audienceUser(true)
    const limited = await audienceMutation(request, user.id, 'datasets', 5)
    if (limited) return limited
    return audienceJson(await createDataset(user.id, await audienceBody(request)), 201)
  } catch (error) {
    return audienceApiError(error)
  }
}
