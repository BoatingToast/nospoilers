import {
  audienceApiError,
  audienceBody,
  audienceJson,
  audienceMutation,
  audienceUser,
} from '@/lib/audience-api'
import { changeStudy, studyReport } from '@/services/audience-engine'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await audienceUser()
    return audienceJson(await studyReport(user.id, (await params).id))
  } catch (error) {
    return audienceApiError(error)
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await audienceUser()
    const limited = await audienceMutation(request, user.id, 'status', 20)
    if (limited) return limited
    return audienceJson(await changeStudy(user.id, (await params).id, await audienceBody(request)))
  } catch (error) {
    return audienceApiError(error)
  }
}
