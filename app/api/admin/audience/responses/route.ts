import { audienceApiError, audienceJson, audienceUser } from '@/lib/audience-api'
import { responseQueue } from '@/services/audience-admin'

export async function GET(request: Request) {
  try {
    await audienceUser(true)
    return audienceJson(await responseQueue(new URL(request.url).searchParams))
  } catch (error) {
    return audienceApiError(error)
  }
}
