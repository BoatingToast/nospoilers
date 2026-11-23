import {
  audienceApiError,
  audienceBody,
  audienceJson,
  audienceMutation,
  audienceUser,
} from '@/lib/audience-api'
import { createStudy, listStudies } from '@/services/audience-engine'

export async function GET() {
  try {
    const user = await audienceUser()
    return audienceJson({ studies: await listStudies(user.id) })
  } catch (error) {
    return audienceApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await audienceUser()
    const limited = await audienceMutation(request, user.id, 'create', 10)
    if (limited) return limited
    return audienceJson(await createStudy(user.id, await audienceBody(request)), 201)
  } catch (error) {
    return audienceApiError(error)
  }
}
