import { audienceApiError, audienceJson, audienceUser } from '@/lib/audience-api'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const user = await audienceUser()
    return audienceJson({
      uploads: await prisma.uploadedMovie.findMany({
        where: { userId: user.id, status: 'ready' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { id: true, title: true },
      }),
    })
  } catch (error) {
    return audienceApiError(error)
  }
}
