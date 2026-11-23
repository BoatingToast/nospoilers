import { audienceApiError, audienceJson, audienceUser } from '@/lib/audience-api'
import { adminOverview } from '@/services/audience-admin'

export async function GET(request: Request) {
  try {
    await audienceUser(true)
    const requested = Number(new URL(request.url).searchParams.get('days') ?? 30)
    return audienceJson(await adminOverview([7, 30, 90].includes(requested) ? requested : 30))
  } catch (error) {
    return audienceApiError(error)
  }
}
