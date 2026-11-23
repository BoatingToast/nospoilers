import { prisma } from '@/lib/db'
import { AudienceError, AUDIENCE_MODEL_VERSION } from '@/lib/audience-engine'

export async function adminOverview(days = 30) {
  const since = new Date(Date.now() - days * 86400_000)
  const [
    users,
    ratings,
    ratedWorks,
    uploads,
    screenings,
    studies,
    participants,
    events,
    feedback,
    reusable,
    quality,
    eventTypes,
    sources,
    daily,
    media,
    recentStudies,
    queue,
    audit,
    datasets,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.movieRating.count(),
    prisma.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT count(DISTINCT "tmdbId") AS count FROM "MovieRating"`.then((r) =>
      Number(r[0]?.count ?? 0),
    ),
    prisma.uploadedMovie.count({ where: { status: 'ready' } }),
    prisma.theaterPremiere.count(),
    prisma.audienceProject.count(),
    prisma.audienceParticipant.count(),
    prisma.audienceEvent.count({ where: { createdAt: { gte: since } } }),
    prisma.audienceParticipant.count({ where: { feedbackAt: { not: null } } }),
    prisma.audienceParticipant.count({
      where: {
        reuseConsent: true,
        quality: 'accepted',
        feedbackAt: { not: null },
        exposedAt: { not: null },
      },
    }),
    prisma.audienceParticipant.groupBy({
      by: ['quality'],
      where: { feedbackAt: { not: null } },
      _count: true,
    }),
    prisma.audienceEvent.groupBy({
      by: ['type'],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    prisma.audienceParticipant.groupBy({ by: ['source'], _count: true }),
    prisma.$queryRaw<
      Array<{ day: string; events: bigint; people: bigint }>
    >`SELECT to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, count(*) AS events, count(DISTINCT "participantId") AS people FROM "AudienceEvent" WHERE "createdAt" >= ${since} GROUP BY day ORDER BY day`,
    prisma.audienceProject.groupBy({ by: ['mediaType'], _count: true }),
    prisma.audienceProject.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        title: true,
        mediaType: true,
        status: true,
        createdAt: true,
        _count: { select: { participants: true, variants: true } },
      },
    }),
    prisma.audienceParticipant.findMany({
      where: { feedbackAt: { not: null }, quality: 'pending' },
      orderBy: { feedbackAt: 'asc' },
      take: 25,
      select: {
        id: true,
        projectId: true,
        primaryInterest: true,
        fitBand: true,
        rating: true,
        intent: true,
        expectation: true,
        progress: true,
        note: true,
        reasons: true,
        quality: true,
        reviewNote: true,
        reuseConsent: true,
        consentVersion: true,
        exposedAt: true,
        feedbackAt: true,
        source: true,
        project: { select: { title: true } },
        variant: { select: { label: true } },
      },
    }),
    prisma.audienceAudit.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, action: true, targetId: true, detail: true, createdAt: true },
    }),
    prisma.audienceDataset.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        rowCount: true,
        trainCount: true,
        evaluationCount: true,
        schemaVersion: true,
        modelVersion: true,
        createdAt: true,
        invalidatedAt: true,
      },
    }),
  ])
  return {
    days,
    generatedAt: new Date().toISOString(),
    modelVersion: AUDIENCE_MODEL_VERSION,
    platform: { users, ratings, ratedWorks, uploads, screenings },
    research: { studies, participants, events, feedback, reusable },
    quality: Object.fromEntries(quality.map((r) => [r.quality, r._count])),
    eventTypes: eventTypes.map((r) => ({ label: r.type, count: r._count })),
    sources: sources.map((r) => ({ label: r.source, count: r._count })),
    media: media.map((r) => ({ label: r.mediaType, count: r._count })),
    daily: daily.map((r) => ({ ...r, events: Number(r.events), people: Number(r.people) })),
    recentStudies,
    queue: queue.map((p) => ({
      ...p,
      secondsToFeedback:
        p.feedbackAt && p.exposedAt
          ? Math.round((p.feedbackAt.getTime() - p.exposedAt.getTime()) / 1000)
          : null,
    })),
    audit,
    datasets,
  }
}

export async function responseQueue(params: URLSearchParams) {
  const quality = params.get('quality') ?? 'pending'
  if (!['pending', 'accepted', 'excluded', 'all'].includes(quality))
    throw new AudienceError('Choose a supported review status.')
  const cursor = params.get('cursor')
  if (cursor && cursor.length > 128) throw new AudienceError('Invalid page cursor.')
  const rows = await prisma.audienceParticipant.findMany({
    where: { feedbackAt: { not: null }, ...(quality === 'all' ? {} : { quality }) },
    orderBy: [{ feedbackAt: 'desc' }, { id: 'desc' }],
    take: 26,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      projectId: true,
      primaryInterest: true,
      fitBand: true,
      rating: true,
      intent: true,
      expectation: true,
      progress: true,
      note: true,
      reasons: true,
      quality: true,
      reviewNote: true,
      reuseConsent: true,
      consentVersion: true,
      exposedAt: true,
      feedbackAt: true,
      source: true,
      project: { select: { title: true } },
      variant: { select: { label: true } },
    },
  })
  return {
    rows: rows
      .slice(0, 25)
      .map((p) => ({
        ...p,
        secondsToFeedback:
          p.feedbackAt && p.exposedAt
            ? Math.round((p.feedbackAt.getTime() - p.exposedAt.getTime()) / 1000)
            : null,
      })),
    nextCursor: rows.length > 25 ? rows[24].id : null,
  }
}

export async function eventExplorer(params: URLSearchParams) {
  const rawDays = Number(params.get('days') ?? 30)
  const days = [7, 30, 90].includes(rawDays) ? rawDays : 30
  const types = [
    'enrollment',
    'exposure',
    'start',
    'progress',
    'interest',
    'feedback',
    'feedback_updated',
  ]
  const type = params.get('type') ?? ''
  if (type && !types.includes(type)) throw new AudienceError('Choose a supported event type.')
  const cursor = params.get('cursor')
  if (cursor && cursor.length > 128) throw new AudienceError('Invalid page cursor.')
  const rows = await prisma.audienceEvent.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - days * 86400_000) },
      ...(type ? { type } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 51,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      createdAt: true,
      projectId: true,
      participantId: true,
      payload: true,
      schemaVersion: true,
      participant: {
        select: {
          source: true,
          quality: true,
          reuseConsent: true,
          project: { select: { title: true } },
          variant: { select: { label: true } },
        },
      },
    },
  })
  return { rows: rows.slice(0, 50), nextCursor: rows.length > 50 ? rows[49].id : null }
}

export async function downloadDataset(adminId: string, id: string) {
  // Serializable transaction prevents a concurrent withdrawal from committing a
  // valid export after its consent has been removed.
  return prisma.$transaction(
    async (tx) => {
      const dataset = await tx.audienceDataset.findUnique({ where: { id } })
      if (!dataset) throw new AudienceError('Dataset not found.', 404)
      if (dataset.invalidatedAt)
        throw new AudienceError(
          'This dataset was invalidated by a consent or review change. Create a new version.',
          410,
        )
      const eligible = await tx.audienceParticipant.count({
        where: {
          id: { in: dataset.participantIds },
          reuseConsent: true,
          quality: 'accepted',
          feedbackAt: { not: null },
        },
      })
      if (eligible !== dataset.rowCount)
        throw new AudienceError('Dataset permissions have changed. Create a new version.', 410)
      await tx.audienceAudit.create({
        data: {
          actorId: adminId,
          action: 'dataset.exported',
          targetId: id,
          detail: { rowCount: dataset.rowCount },
        },
      })
      return { id, rows: dataset.rows }
    },
    { isolationLevel: 'Serializable' },
  )
}
