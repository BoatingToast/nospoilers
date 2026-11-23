import { audienceApiError, audienceJson, audienceUser } from '@/lib/audience-api'
import { discoverStudies } from '@/services/audience-engine'

export async function GET() {
  try {
    const user = await audienceUser()
    return audienceJson({ studies: await discoverStudies(user.id) })
  } catch (error) {
    return audienceApiError(error)
  }
}
