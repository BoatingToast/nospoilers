import { buildAudienceLabInsights, type AudienceInsightRow, type AudienceLabListItem, type AudienceLabReportData } from '@/lib/audience-lab'
import { prisma } from '@/lib/db'
import { TheaterError, theaterStatus, type TheaterKind } from '@/lib/theater'

const attendanceSignals = {
  watchedAt: true,
  rating: true,
  recommendScore: true,
  pacing: true,
  reactions: true,
  standoutMoment: true,
  improvement: true,
  feedbackAt: true,
  user: {
    select: {
      tasteProfile: {
        select: {
          suspenseScore: true,
          emotionalImpactScore: true,
          complexityScore: true,
          humorScore: true,
          realismScore: true,
          actionScore: true,
          darknessScore: true,
        },
      },
    },
  },
} as const

function insightRows(attendees: Array<{
  watchedAt: Date | null
  rating: number | null
  recommendScore: number | null
  pacing: string | null
  reactions: string[]
  standoutMoment: string | null
  improvement: string | null
  feedbackAt: Date | null
  user: { tasteProfile: AudienceInsightRow['taste'] }
}>): AudienceInsightRow[] {
  return attendees.map(attendee => ({
    watched: attendee.watchedAt !== null,
    rating: attendee.rating,
    recommendScore: attendee.recommendScore,
    pacing: attendee.pacing,
    reactions: attendee.reactions,
    standoutMoment: attendee.standoutMoment,
    improvement: attendee.improvement,
    feedbackAt: attendee.feedbackAt,
    taste: attendee.user.tasteProfile,
  }))
}

export async function listAudienceLabs(userId: string): Promise<AudienceLabListItem[]> {
  const premieres = await prisma.theaterPremiere.findMany({
    where: { ownerId: userId },
    select: {
      id: true,
      title: true,
      kind: true,
      startsAt: true,
      endsAt: true,
      cancelledAt: true,
      capacity: true,
      attendees: { select: { watchedAt: true, rating: true } },
    },
    orderBy: { startsAt: 'desc' },
    take: 50,
  })
  return premieres.map(premiere => {
    const responses = premiere.attendees.flatMap(attendee => attendee.rating === null ? [] : [attendee.rating])
    return {
      id: premiere.id,
      title: premiere.title,
      kind: premiere.kind as TheaterKind,
      startsAt: premiere.startsAt.toISOString(),
      status: theaterStatus(premiere),
      capacity: premiere.capacity,
      reservedCount: premiere.attendees.length,
      watchedCount: premiere.attendees.filter(attendee => attendee.watchedAt !== null).length,
      responseCount: responses.length,
      averageRating: responses.length ? Math.round(responses.reduce((sum, rating) => sum + rating, 0) / responses.length * 10) / 10 : null,
    }
  })
}

export async function readAudienceLab(id: string, userId: string): Promise<AudienceLabReportData> {
  const premiere = await prisma.theaterPremiere.findFirst({
    where: { id, ownerId: userId },
    select: {
      id: true,
      title: true,
      kind: true,
      startsAt: true,
      endsAt: true,
      cancelledAt: true,
      capacity: true,
      attendees: { select: attendanceSignals },
    },
  })
  if (!premiere) throw new TheaterError('Audience Lab not found, or it does not belong to you.', 404)
  return {
    id: premiere.id,
    title: premiere.title,
    kind: premiere.kind as TheaterKind,
    startsAt: premiere.startsAt.toISOString(),
    status: theaterStatus(premiere),
    capacity: premiere.capacity,
    reservedCount: premiere.attendees.length,
    insights: buildAudienceLabInsights(insightRows(premiere.attendees)),
  }
}
