import { audienceApiError, audienceJson, audienceUser } from '@/lib/audience-api'
import { AudienceError } from '@/lib/audience-engine'
import { prisma } from '@/lib/db'
import { studyReport } from '@/services/audience-engine'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await audienceUser(true)
    const id = (await params).id
    const project = await prisma.audienceProject.findUnique({
      where: { id },
      select: { ownerId: true },
    })
    if (!project) throw new AudienceError('Study not found.', 404)
    return audienceJson(await studyReport(project.ownerId, id))
  } catch (error) {
    return audienceApiError(error)
  }
}
