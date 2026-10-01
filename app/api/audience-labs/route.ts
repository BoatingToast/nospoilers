import { theaterApiError, theaterJson, theaterUser } from '@/lib/theater-api'
import { listAudienceLabs } from '@/services/audience-lab'

export async function GET() {
  try {
    const user = await theaterUser()
    return theaterJson({ labs: await listAudienceLabs(user.id) })
  } catch (error) { return theaterApiError(error) }
}
