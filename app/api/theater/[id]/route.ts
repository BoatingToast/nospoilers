import { theaterApiError, theaterJson, theaterUser } from '@/lib/theater-api'
import { readTheaterRoom, theaterAction } from '@/services/theater'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Context) {
  try {
    const user = await theaterUser()
    return theaterJson(await readTheaterRoom((await context.params).id, user.id))
  } catch (error) { return theaterApiError(error) }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await theaterUser()
    return theaterJson(await theaterAction((await context.params).id, user.id, await request.json()))
  } catch (error) { return theaterApiError(error) }
}
