import { prisma } from '@/lib/db'
import { buildRomComRoast, type RomComRoastResult } from '@/lib/rom-com-roast'
import type { DNAScores } from '@/types'

interface MovieRoastContext {
  tmdbId: number
  title: string
  genreIds: number[]
  keywords: string[]
  releaseDate: string | null
  runtime: number | null
  movieDNA: DNAScores
}

export async function getRomComRoastForUser(
  userId: string,
  movie: MovieRoastContext,
): Promise<RomComRoastResult | null> {
  const profile = await prisma.tasteProfile.findUnique({
    where: { userId },
    select: {
      suspenseScore: true,
      emotionalImpactScore: true,
      complexityScore: true,
      humorScore: true,
      realismScore: true,
      actionScore: true,
      darknessScore: true,
    },
  })

  if (!profile) return null

  return buildRomComRoast({
    ...movie,
    userDNA: profile,
  })
}
