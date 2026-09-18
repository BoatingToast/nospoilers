import { theaterApiError, theaterJson, theaterUser } from '@/lib/theater-api'
import { enforceRateLimit } from '@/lib/rate-limit'
import { createPremiere, listPremieres } from '@/services/theater'

export async function GET() {
  try {
    const user = await theaterUser()
    return theaterJson(await listPremieres(user.id))
  } catch (error) { return theaterApiError(error) }
}

export async function POST(request: Request) {
  try {
    const user = await theaterUser()
    const limited = await enforceRateLimit(request, { scope: 'theater-create', identifier: user.id, limit: 10, windowMs: 86400_000 })
    if (limited) return limited
    return theaterJson(await createPremiere(user.id, await request.json()), 201)
  } catch (error) { return theaterApiError(error) }
}
