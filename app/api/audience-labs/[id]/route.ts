import { theaterApiError, theaterJson, theaterUser } from '@/lib/theater-api'
import { readAudienceLab } from '@/services/audience-lab'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await theaterUser()
    return theaterJson(await readAudienceLab((await params).id, user.id))
  } catch (error) { return theaterApiError(error) }
}
