import { theaterApiError, theaterJson, theaterUser } from '@/lib/theater-api'
import { theaterStream } from '@/services/theater'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await theaterUser()
    return theaterJson(await theaterStream((await params).id, user.id))
  } catch (error) { return theaterApiError(error) }
}
