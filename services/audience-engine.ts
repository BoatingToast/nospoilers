import { randomInt } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getSupabaseAdmin, isMovieStorageConfigured } from '@/lib/supabase-storage'
import { MOVIE_UPLOAD_BUCKET } from '@/lib/movie-uploads'
import {
  AUDIENCE_CONSENT_VERSION,
  AUDIENCE_MODEL_VERSION,
  AUDIENCE_DATASET_SCHEMA_VERSION,
  AudienceError,
  calculateFit,
  compareVariants,
  datasetSplit,
  MIN_COHORT_SIZE,
  parseEnrollment,
  parseEvent,
  parseFeedback,
  parseStudy,
  rateInterval,
  readFacets,
  assertDatasetRecord,
  type QualityState,
} from '@/lib/audience-engine'

type Tx = Prisma.TransactionClient

// Serializable retries protect assignment, event deduplication and withdrawal
// against simultaneous tabs/requests and dataset creation on another instance.
async function serial<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: 'Serializable', timeout: 15_000 })
    } catch (error) {
      if (
        attempt < 3 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2034', 'P2002'].includes(error.code)
      )
        continue
      throw error
    }
  }
}

async function owned(tx: Tx | typeof prisma, id: string, ownerId: string) {
  const project = await tx.audienceProject.findFirst({ where: { id, ownerId } })
  if (!project) throw new AudienceError('Study not found.', 404)
  return project
}

export async function listStudies(ownerId: string) {
  return prisma.audienceProject.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      title: true,
      mediaType: true,
      status: true,
      shareCode: true,
      discoverable: true,
      createdAt: true,
      _count: { select: { variants: true, participants: true } },
    },
  })
}

export async function createStudy(ownerId: string, input: unknown) {
  const parsed = parseStudy(input)
  const { variants, workKey, ...data } = parsed
  return serial(async (tx) => {
    if (
      (await tx.audienceProject.count({
        where: { ownerId, status: { in: ['draft', 'active'] } },
      })) >= 100
    )
      throw new AudienceError('Close an existing study before creating another.', 409)
    const uploads = variants.flatMap((v) => (v.uploadId ? [v.uploadId] : []))
    if (
      uploads.length &&
      (await tx.uploadedMovie.count({
        where: { id: { in: uploads }, userId: ownerId, status: 'ready' },
      })) !== new Set(uploads).size
    )
      throw new AudienceError('Choose only your own completed uploads.')
    const work = await tx.audienceWork.upsert({
      where: { ownerId_mediaType_workKey: { ownerId, mediaType: data.mediaType, workKey } },
      create: { ownerId, mediaType: data.mediaType, workKey, title: data.title },
      update: {},
    })
    const project = await tx.audienceProject.create({
      data: { ...data, ownerId, workId: work.id, variants: { create: variants } },
    })
    await tx.audienceAudit.create({
      data: {
        actorId: ownerId,
        action: 'study.created',
        targetId: project.id,
        detail: { mediaType: project.mediaType, variants: variants.length, rightsConfirmed: true },
      },
    })
    return { id: project.id }
  })
}

export async function changeStudy(ownerId: string, id: string, value: unknown) {
  const status = (value as { status?: unknown } | null)?.status
  if (!['active', 'paused', 'completed'].includes(String(status)))
    throw new AudienceError('Choose active, paused, or completed.')
  return serial(async (tx) => {
    const project = await owned(tx, id, ownerId)
    if (project.status === 'completed')
      throw new AudienceError(
        'Completed studies are immutable. Create a new study for another test.',
        409,
      )
    if (status === 'active') {
      const broken = await tx.audienceVariant.count({
        where: { projectId: id, uploadId: { not: null }, upload: { status: { not: 'ready' } } },
      })
      if (broken) throw new AudienceError('Finish uploading every preview before launching.', 409)
      const videos = await tx.audienceVariant.count({
        where: { projectId: id, uploadId: { not: null } },
      })
      if (videos && !isMovieStorageConfigured())
        throw new AudienceError('Configure movie storage before launching a video study.', 503)
    }
    await tx.audienceProject.update({ where: { id }, data: { status: String(status) } })
    await tx.audienceAudit.create({
      data: {
        actorId: ownerId,
        action: `study.${status}`,
        targetId: id,
        detail: { previous: project.status },
      },
    })
    return { ok: true }
  })
}

export async function publicStudy(shareCode: string, userId?: string) {
  const project = await prisma.audienceProject.findUnique({
    where: { shareCode },
    select: {
      id: true,
      ownerId: true,
      title: true,
      description: true,
      mediaType: true,
      status: true,
      _count: { select: { variants: true } },
    },
  })
  if (!project || project.status === 'draft')
    throw new AudienceError('This study is not available.', 404)
  const participant = userId
    ? await prisma.audienceParticipant.findUnique({
        where: { projectId_userId: { projectId: project.id, userId } },
        select: { id: true, feedbackAt: true, reuseConsent: true },
      })
    : null
  return {
    title: project.title,
    description: project.description,
    mediaType: project.mediaType,
    status: project.status,
    variants: project._count.variants,
    isOwner: project.ownerId === userId,
    participant,
    consentVersion: AUDIENCE_CONSENT_VERSION,
  }
}

async function participantSession(id: string, userId: string) {
  const p = await prisma.audienceParticipant.findFirst({
    where: { id, userId },
    include: {
      variant: { include: { upload: { select: { storagePath: true } } } },
      project: { select: { status: true, title: true } },
    },
  })
  if (!p) throw new AudienceError('Participation not found.', 404)
  let videoUrl: string | null = null
  if (p.variant.upload && p.project.status === 'active') {
    const { data, error } = await getSupabaseAdmin()
      .storage.from(MOVIE_UPLOAD_BUCKET)
      .createSignedUrl(p.variant.upload.storagePath, 300)
    if (error || !data)
      throw new AudienceError('The preview could not be loaded. Please try again.', 503)
    videoUrl = data.signedUrl
  }
  return {
    id: p.id,
    title: p.project.title,
    status: p.project.status,
    headline: p.variant.headline,
    concept: p.variant.concept,
    hasVideo: Boolean(p.variant.upload),
    videoUrl,
    progress: p.progress,
    feedback: p.feedbackAt
      ? {
          rating: p.rating,
          intent: p.intent,
          expectation: p.expectation,
          note: p.note,
          reasons: p.reasons,
        }
      : null,
    interested: Boolean(p.interestedAt),
    reuseConsent: p.reuseConsent,
  }
}

export async function joinStudy(shareCode: string, userId: string, value: unknown) {
  const enrollment = parseEnrollment(value)
  const id = await serial(async (tx) => {
    const project = await tx.audienceProject.findUnique({
      where: { shareCode },
      include: { variants: { orderBy: { position: 'asc' } } },
    })
    if (!project || project.status !== 'active')
      throw new AudienceError('This study is not accepting participants.', 409)
    if (project.ownerId === userId)
      throw new AudienceError('Creators cannot contribute responses to their own study.', 403)
    const existing = await tx.audienceParticipant.findUnique({
      where: { projectId_userId: { projectId: project.id, userId } },
    })
    if (existing) return existing.id
    if (!project.variants.length) throw new AudienceError('This study has no preview.', 409)
    const variant = project.variants[randomInt(project.variants.length)]
    const fit = calculateFit(enrollment.facets, readFacets(project.targetFacets))
    const participant = await tx.audienceParticipant.create({
      data: {
        projectId: project.id,
        userId,
        variantId: variant.id,
        assignmentProbability: 1 / project.variants.length,
        consentVersion: AUDIENCE_CONSENT_VERSION,
        reuseConsent: enrollment.reuseConsent,
        facets: enrollment.facets,
        primaryInterest: enrollment.primaryInterest,
        fitScore: fit.score,
        fitBand: fit.band,
        modelVersion: fit.modelVersion,
        source: enrollment.source,
      },
    })
    await tx.audienceEvent.create({
      data: {
        participantId: participant.id,
        projectId: project.id,
        eventKey: 'enrollment-v1',
        type: 'enrollment',
        payload: {
          source: enrollment.source,
          consentVersion: AUDIENCE_CONSENT_VERSION,
          assignmentProbability: participant.assignmentProbability,
        },
      },
    })
    return participant.id
  })
  return participantSession(id, userId)
}

export async function resumeStudy(shareCode: string, userId: string) {
  const p = await prisma.audienceParticipant.findFirst({
    where: { userId, project: { shareCode } },
    select: { id: true },
  })
  if (!p) throw new AudienceError('Join this study first.', 404)
  return participantSession(p.id, userId)
}

export async function recordEvent(shareCode: string, userId: string, value: unknown) {
  const event = parseEvent(value)
  return serial(async (tx) => {
    const p = await tx.audienceParticipant.findFirst({
      where: { userId, project: { shareCode } },
      include: { project: { select: { status: true } }, variant: { select: { uploadId: true } } },
    })
    if (!p) throw new AudienceError('Join this study before recording a response.', 403)
    if (p.project.status !== 'active')
      throw new AudienceError('This study is not collecting events.', 409)
    if (
      await tx.audienceEvent.findUnique({
        where: { participantId_eventKey: { participantId: p.id, eventKey: event.eventKey } },
      })
    )
      return { ok: true, duplicate: true }
    if (event.type !== 'exposure' && !p.exposedAt)
      throw new AudienceError('Open the preview before responding.', 409)
    if (event.type === 'progress' && !p.startedAt)
      throw new AudienceError('Start the preview before reporting progress.', 409)
    const now = new Date()
    const progress = event.type === 'progress' ? Math.max(p.progress, event.progress) : p.progress
    // Progress is explicitly browser-reported, not proof of attention or purchase.
    const data: Prisma.AudienceParticipantUpdateInput = { progress }
    if (event.type === 'exposure' && !p.exposedAt) data.exposedAt = now
    if (event.type === 'start' && !p.startedAt) data.startedAt = now
    if (event.type === 'interest' && !p.interestedAt) data.interestedAt = now
    if (progress >= 90 && !p.completedAt) data.completedAt = now
    await tx.audienceParticipant.update({ where: { id: p.id }, data })
    await tx.audienceEvent.create({
      data: {
        participantId: p.id,
        projectId: p.projectId,
        eventKey: event.eventKey,
        type: event.type,
        payload: {
          progress: event.type === 'progress' ? progress : null,
          measurement: 'first_party_browser_report',
        },
      },
    })
    return { ok: true }
  })
}

export async function submitFeedback(shareCode: string, userId: string, value: unknown) {
  const { eventKey, ...feedback } = parseFeedback(value)
  return serial(async (tx) => {
    const p = await tx.audienceParticipant.findFirst({
      where: { userId, project: { shareCode } },
      include: { project: { select: { status: true } } },
    })
    if (!p) throw new AudienceError('Join this study first.', 403)
    if (
      await tx.audienceEvent.findUnique({
        where: { participantId_eventKey: { participantId: p.id, eventKey } },
      })
    )
      return { ok: true, duplicate: true }
    if (p.project.status !== 'active')
      throw new AudienceError('This study is no longer collecting feedback.', 409)
    if (!p.exposedAt || Date.now() - p.exposedAt.getTime() < 8_000)
      throw new AudienceError(
        'Spend a little time with the preview before submitting feedback.',
        409,
      )
    const previouslySubmitted = Boolean(p.feedbackAt)
    await tx.audienceParticipant.update({
      where: { id: p.id },
      data: {
        ...feedback,
        feedbackAt: new Date(),
        quality: 'pending',
        reviewedAt: null,
        reviewedBy: null,
        reviewNote: '',
      },
    })
    await invalidateDatasets(tx, p.id)
    await tx.audienceEvent.create({
      data: {
        participantId: p.id,
        projectId: p.projectId,
        eventKey,
        type: previouslySubmitted ? 'feedback_updated' : 'feedback',
        payload: {
          rating: feedback.rating,
          intent: feedback.intent,
          expectation: feedback.expectation,
          reasons: feedback.reasons,
        },
      },
    })
    return { ok: true }
  })
}

async function invalidateDatasets(tx: Tx, participantId: string) {
  await tx.audienceDataset.updateMany({
    where: { invalidatedAt: null, participantIds: { has: participantId } },
    data: { invalidatedAt: new Date(), rows: [], participantIds: [] },
  })
}

export async function withdrawStudy(shareCode: string, userId: string) {
  return serial(async (tx) => {
    const p = await tx.audienceParticipant.findFirst({
      where: { userId, project: { shareCode } },
      select: { id: true, projectId: true },
    })
    if (p) {
      await invalidateDatasets(tx, p.id)
      await tx.audienceParticipant.delete({ where: { id: p.id } })
      await tx.audienceAudit.create({
        data: {
          actorId: userId,
          action: 'consent.withdrawn',
          targetId: p.projectId,
          detail: { localDatasetsInvalidated: true },
        },
      })
    }
    return { ok: true }
  })
}

export async function discoverStudies(userId: string) {
  const [projects, taste] = await Promise.all([
    prisma.audienceProject.findMany({
      where: { status: 'active', discoverable: true, ownerId: { not: userId } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        shareCode: true,
        title: true,
        description: true,
        mediaType: true,
        targetFacets: true,
      },
    }),
    prisma.tasteProfile.findUnique({ where: { userId } }),
  ])
  const preferences = taste
    ? {
        atmosphere: taste.darknessScore,
        relationships: taste.emotionalImpactScore,
        ideas: taste.complexityScore,
        tension: taste.suspenseScore,
        humor: taste.humorScore,
        spectacle: taste.actionScore,
      }
    : null
  return projects
    .map(({ targetFacets, ...project }) => ({
      ...project,
      fit: preferences ? calculateFit(preferences, readFacets(targetFacets)) : null,
    }))
    .sort((a, b) => (b.fit?.score ?? 0) - (a.fit?.score ?? 0))
}

type Aggregate = {
  variantId: string
  assigned: bigint
  exposed: bigint
  started: bigint
  completed: bigint
  interested: bigint
  responses: bigint
  rating: number | null
  intent: number | null
  expectation: number | null
}
type Cohort = {
  dimension: string
  label: string
  participants: bigint
  exposed: bigint
  interested: bigint
  responses: bigint
  rating: number | null
}

export async function studyReport(ownerId: string, id: string) {
  const project = await owned(prisma, id, ownerId)
  const [variants, aggregates, cohorts, daily, quality, notes] = await Promise.all([
    prisma.audienceVariant.findMany({
      where: { projectId: id },
      orderBy: { position: 'asc' },
      select: { id: true, label: true, headline: true, concept: true, uploadId: true },
    }),
    prisma.$queryRaw<Aggregate[]>`SELECT "variantId", count(*) AS assigned,
      count(*) FILTER (WHERE "exposedAt" IS NOT NULL) AS exposed,
      count(*) FILTER (WHERE "startedAt" IS NOT NULL) AS started,
      count(*) FILTER (WHERE "completedAt" IS NOT NULL) AS completed,
      count(*) FILTER (WHERE "interestedAt" IS NOT NULL) AS interested,
      count(*) FILTER (WHERE "feedbackAt" IS NOT NULL) AS responses,
      avg(rating)::float AS rating, avg(intent)::float AS intent, avg(expectation)::float AS expectation
      FROM "AudienceParticipant" WHERE "projectId" = ${id} AND quality <> 'excluded' GROUP BY "variantId"`,
    prisma.$queryRaw<
      Cohort[]
    >`WITH base AS (SELECT * FROM "AudienceParticipant" WHERE "projectId" = ${id} AND quality <> 'excluded'),
      expanded AS (SELECT 'interest' AS dimension, "primaryInterest" AS label, * FROM base UNION ALL SELECT 'fit' AS dimension, "fitBand" AS label, * FROM base UNION ALL SELECT 'source' AS dimension, source AS label, * FROM base)
      SELECT dimension, label, count(*) AS participants, count(*) FILTER (WHERE "exposedAt" IS NOT NULL) AS exposed,
      count(*) FILTER (WHERE "interestedAt" IS NOT NULL) AS interested, count(*) FILTER (WHERE "feedbackAt" IS NOT NULL) AS responses, avg(rating)::float AS rating
      FROM expanded GROUP BY dimension, label HAVING count(*) >= ${MIN_COHORT_SIZE} ORDER BY count(*) DESC`,
    prisma.$queryRaw<
      Array<{ day: string; participants: bigint; responses: bigint }>
    >`SELECT to_char("consentedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, count(*) AS participants, count(*) FILTER (WHERE "feedbackAt" IS NOT NULL) AS responses FROM "AudienceParticipant" WHERE "projectId" = ${id} AND quality <> 'excluded' GROUP BY day ORDER BY day DESC LIMIT 90`,
    prisma.audienceParticipant.groupBy({
      by: ['quality'],
      where: { projectId: id, feedbackAt: { not: null } },
      _count: true,
    }),
    prisma.audienceParticipant.findMany({
      where: { projectId: id, quality: 'accepted', feedbackAt: { not: null }, note: { not: '' } },
      orderBy: { feedbackAt: 'desc' },
      take: 20,
      select: { note: true },
    }),
  ])
  const rows = variants.map((v) => {
    const a = aggregates.find((row) => row.variantId === v.id)
    const counts = {
      assigned: Number(a?.assigned ?? 0),
      exposed: Number(a?.exposed ?? 0),
      started: Number(a?.started ?? 0),
      completed: Number(a?.completed ?? 0),
      interested: Number(a?.interested ?? 0),
      responses: Number(a?.responses ?? 0),
    }
    return {
      ...v,
      ...counts,
      rating: counts.responses >= MIN_COHORT_SIZE ? (a?.rating ?? null) : null,
      intent: counts.responses >= MIN_COHORT_SIZE ? (a?.intent ?? null) : null,
      expectation: counts.responses >= MIN_COHORT_SIZE ? (a?.expectation ?? null) : null,
      interestRate: rateInterval(counts.interested, counts.exposed),
    }
  })
  const totals = rows.reduce(
    (sum, row) => ({
      assigned: sum.assigned + row.assigned,
      exposed: sum.exposed + row.exposed,
      started: sum.started + row.started,
      completed: sum.completed + row.completed,
      interested: sum.interested + row.interested,
      responses: sum.responses + row.responses,
    }),
    { assigned: 0, exposed: 0, started: 0, completed: 0, interested: 0, responses: 0 },
  )
  return {
    project: {
      id: project.id,
      workId: project.workId,
      title: project.title,
      description: project.description,
      mediaType: project.mediaType,
      status: project.status,
      shareCode: project.shareCode,
      discoverable: project.discoverable,
      createdAt: project.createdAt.toISOString(),
      modelVersion: project.modelVersion,
      rightsNote: project.rightsNote,
    },
    totals,
    variants: rows,
    cohorts: cohorts.map((c) => ({
      dimension: c.dimension,
      label: c.label,
      participants: Number(c.participants),
      exposed: Number(c.exposed),
      interested: Number(c.interested),
      responses: Number(c.responses),
      rating: Number(c.responses) >= MIN_COHORT_SIZE ? c.rating : null,
      interestRate: rateInterval(Number(c.interested), Number(c.exposed)),
    })),
    daily: daily
      .reverse()
      .map((d) => ({ ...d, participants: Number(d.participants), responses: Number(d.responses) })),
    quality: Object.fromEntries(quality.map((q) => [q.quality, q._count])),
    notes: totals.responses >= MIN_COHORT_SIZE ? notes.map((n) => n.note) : [],
    comparison: compareVariants(rows),
    minCohortSize: MIN_COHORT_SIZE,
    methodology: {
      assignment: 'Uniform random assignment, persisted per member and study.',
      measurement:
        'First-party browser reports. Interest is an in-app action, not a purchase. Progress is not verified attention.',
      fit: 'Explicit preference-distance heuristic; scores are not probabilities.',
      reporting:
        'Unique participants; excluded responses omitted. Pending responses remain provisional. Small-cohort averages and comments are suppressed.',
    },
  }
}

export async function reviewResponse(adminId: string, value: unknown) {
  const body = value as { id?: unknown; quality?: unknown; note?: unknown } | null
  if (
    !body ||
    typeof body.id !== 'string' ||
    !['accepted', 'excluded', 'pending'].includes(String(body.quality)) ||
    typeof body.note !== 'string' ||
    body.note.length > 600
  )
    throw new AudienceError(
      'Choose a response, a review outcome, and a note of up to 600 characters.',
    )
  const quality = body.quality as QualityState
  return serial(async (tx) => {
    const p = await tx.audienceParticipant.findUnique({ where: { id: String(body.id) } })
    if (!p || !p.feedbackAt) throw new AudienceError('Submitted response not found.', 404)
    await invalidateDatasets(tx, p.id)
    await tx.audienceParticipant.update({
      where: { id: p.id },
      data: {
        quality,
        reviewNote: String(body.note).trim(),
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    })
    await tx.audienceAudit.create({
      data: {
        actorId: adminId,
        action: 'response.reviewed',
        targetId: p.id,
        detail: { previous: p.quality, quality, note: String(body.note).trim() },
      },
    })
    return { ok: true }
  })
}

export async function createDataset(adminId: string, value: unknown) {
  const name = (value as { name?: unknown } | null)?.name
  if (typeof name !== 'string' || !name.trim() || name.length > 100)
    throw new AudienceError('Name this dataset version using 1–100 characters.')
  return serial(async (tx) => {
    const eligible = await tx.audienceParticipant.findMany({
      where: {
        reuseConsent: true,
        quality: 'accepted',
        feedbackAt: { not: null },
        exposedAt: { not: null },
      },
      orderBy: { id: 'asc' },
      take: 5001,
      select: {
        id: true,
        projectId: true,
        variantId: true,
        facets: true,
        primaryInterest: true,
        fitScore: true,
        fitBand: true,
        modelVersion: true,
        assignmentProbability: true,
        consentVersion: true,
        source: true,
        progress: true,
        rating: true,
        intent: true,
        expectation: true,
        reasons: true,
        interestedAt: true,
        project: { select: { workId: true, mediaType: true, targetFacets: true } },
      },
    })
    if (!eligible.length)
      throw new AudienceError(
        'Review and accept at least one response with shared-dataset consent before creating a dataset.',
        409,
      )
    if (eligible.length > 5000)
      throw new AudienceError(
        'This export exceeds 5,000 rows. Use a partitioned data pipeline before creating a larger version.',
        413,
      )
    for (const response of eligible) assertDatasetRecord(response)
    const rows = eligible.map((p) => ({
      schemaVersion: AUDIENCE_DATASET_SCHEMA_VERSION,
      sampleId: p.id,
      workId: p.project.workId,
      studyId: p.projectId,
      variantId: p.variantId,
      split: datasetSplit(p.project.workId),
      medium: p.project.mediaType,
      preferences: p.facets,
      workFacets: p.project.targetFacets,
      primaryInterest: p.primaryInterest,
      fitScore: p.fitScore,
      fitBand: p.fitBand,
      modelVersion: p.modelVersion,
      assignmentProbability: p.assignmentProbability,
      consentVersion: p.consentVersion,
      source: p.source,
      outcome: {
        reportedProgress: p.progress,
        rating: p.rating,
        intent: p.intent,
        expectation: p.expectation,
        reasons: p.reasons,
        expressedInterest: Boolean(p.interestedAt),
      },
      provenance: 'consented_first_party_research',
      quality: 'human_accepted',
    }))
    const dataset = await tx.audienceDataset.create({
      data: {
        name: name.trim(),
        createdById: adminId,
        schemaVersion: AUDIENCE_DATASET_SCHEMA_VERSION,
        modelVersion: AUDIENCE_MODEL_VERSION,
        rowCount: rows.length,
        trainCount: rows.filter((r) => r.split === 'train').length,
        evaluationCount: rows.filter((r) => r.split === 'evaluation').length,
        participantIds: eligible.map((p) => p.id),
        rows: rows as Prisma.InputJsonValue,
      },
    })
    await tx.audienceAudit.create({
      data: {
        actorId: adminId,
        action: 'dataset.created',
        targetId: dataset.id,
        detail: { rowCount: dataset.rowCount, schemaVersion: AUDIENCE_DATASET_SCHEMA_VERSION },
      },
    })
    return { id: dataset.id }
  })
}
