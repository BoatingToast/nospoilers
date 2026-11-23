import {
  audienceApiError,
  audienceBody,
  audienceJson,
  audienceMutation,
  audienceUser,
} from '@/lib/audience-api'
import { joinStudy, resumeStudy, withdrawStudy } from '@/services/audience-engine'

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const user = await audienceUser()
    return audienceJson(await resumeStudy((await params).code, user.id))
  } catch (error) {
    return audienceApiError(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const user = await audienceUser()
    const limited = await audienceMutation(request, user.id, 'join', 15)
    if (limited) return limited
    return audienceJson(await joinStudy((await params).code, user.id, await audienceBody(request)))
  } catch (error) {
    return audienceApiError(error)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const user = await audienceUser()
    const limited = await audienceMutation(request, user.id, 'withdraw', 10)
    if (limited) return limited
    return audienceJson(await withdrawStudy((await params).code, user.id))
  } catch (error) {
    return audienceApiError(error)
  }
}
