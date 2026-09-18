import { prisma } from '@/lib/db'
import { theaterApiError, theaterJson, theaterUser } from '@/lib/theater-api'

export async function GET() {
  try {
    const user = await theaterUser()
    const uploads = await prisma.uploadedMovie.findMany({
      where: { userId: user.id, status: 'ready' }, orderBy: { createdAt: 'desc' }, take: 100,
      select: { id: true, title: true, description: true, mimeType: true },
    })
    return theaterJson({ uploads })
  } catch (error) { return theaterApiError(error) }
}
