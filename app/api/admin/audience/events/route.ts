import { audienceApiError, audienceJson, audienceUser } from '@/lib/audience-api'
import { eventExplorer } from '@/services/audience-admin'

export async function GET(request: Request) {
  try {
    await audienceUser(true)
    return audienceJson(await eventExplorer(new URL(request.url).searchParams))
  } catch (error) {
    return audienceApiError(error)
  }
}
