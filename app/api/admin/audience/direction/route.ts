import { audienceApiError, audienceJson, audienceUser } from '@/lib/audience-api'
import { audienceDirection } from '@/services/audience-direction'

export async function GET(request: Request) {
  try {
    await audienceUser(true)
    const value = Number(new URL(request.url).searchParams.get('days') ?? 30)
    return audienceJson(await audienceDirection([7, 30, 90].includes(value) ? value : 30))
  } catch (error) {
    return audienceApiError(error)
  }
}
