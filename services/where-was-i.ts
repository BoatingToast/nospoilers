import 'server-only'
import { createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import {
  buildExtractiveAnswer,
  filterEvidenceAtBoundary,
  normalizeQuestion,
  rankEvidenceCandidates,
  resolveClaims,
  type EvidenceClaim,
  type EvidenceRecord,
  type GroundedAnswer,
} from '@/lib/where-was-i'
import { selectGroundedEvidence } from './where-was-i-model'

export interface WhereWasICheckpoint {
  id: string
  ordinal: number
  label: string
  season: number | null
  episode: number | null
  filmProgressPercent: number | null
}

export interface WhereWasICharacter {
  id: string
  displayName: string
  viewerContext: ReturnType<typeof resolveClaims>
  relationships: ReturnType<typeof resolveClaims>
  characterKnowledge: ReturnType<typeof resolveClaims>
}

export interface WhereWasISession {
  title: {
    slug: string
    name: string
    format: string
    premise: string
    sourceVersion: number
    rightsNote: string
    isDemo: boolean
  }
  checkpoints: WhereWasICheckpoint[]
  authorizedCheckpoint: WhereWasICheckpoint | null
  shortRecap: ReturnType<typeof resolveClaims>
  longRecap: ReturnType<typeof resolveClaims>
  characters: WhereWasICharacter[]
  suggestedQuestions: Array<{ label: string; question: string; characterId?: string }>
  modelConfigured: boolean
}

const checkpointMetadataSelect = {
  id: true,
  ordinal: true,
  season: true,
  episode: true,
  filmProgressPercent: true,
} satisfies Prisma.ResumeCheckpointSelect

function parseClaims(value: Prisma.JsonValue): EvidenceClaim[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(raw => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
    const claim = raw as Record<string, Prisma.JsonValue>
    if (typeof claim.text !== 'string' || !Array.isArray(claim.evidenceIds)) return []
    const evidenceIds = claim.evidenceIds.filter((id): id is string => typeof id === 'string')
    return evidenceIds.length ? [{ text: claim.text, evidenceIds }] : []
  })
}

function toEvidence(item: {
  id: string
  kind: string
  characterKey: string | null
  text: string
  sourceLabel: string
  sourceRef: string
  sourceExcerpt: string
  earliestCheckpoint: {
    ordinal: number
    season: number | null
    episode: number | null
    filmProgressPercent: number | null
  }
}): EvidenceRecord {
  return {
    id: item.id,
    kind: item.kind,
    characterKey: item.characterKey,
    text: item.text,
    sourceLabel: item.sourceLabel,
    sourceRef: item.sourceRef,
    sourceExcerpt: item.sourceExcerpt,
    earliestOrdinal: item.earliestCheckpoint.ordinal,
    earliestCheckpointLabel: safeCheckpointLabel(item.earliestCheckpoint),
  }
}

function safeCheckpointLabel(checkpoint: {
  ordinal: number
  season: number | null
  episode: number | null
  filmProgressPercent: number | null
}): string {
  if (checkpoint.season !== null && checkpoint.episode !== null) {
    return checkpoint.season === 1
      ? `Finished episode ${checkpoint.episode}`
      : `Finished season ${checkpoint.season}, episode ${checkpoint.episode}`
  }
  if (checkpoint.filmProgressPercent !== null) return `Reached the supported ${checkpoint.filmProgressPercent}% checkpoint`
  return `Confirmed checkpoint ${checkpoint.ordinal}`
}

function publicCheckpoint(checkpoint: Omit<WhereWasICheckpoint, 'label'>): WhereWasICheckpoint {
  return {
    id: checkpoint.id,
    ordinal: checkpoint.ordinal,
    label: safeCheckpointLabel(checkpoint),
    season: checkpoint.season,
    episode: checkpoint.episode,
    filmProgressPercent: checkpoint.filmProgressPercent,
  }
}

async function loadAuthorizedContext(userId: string, slug: string) {
  const title = await prisma.resumeTitle.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      catalogId: true,
      title: true,
      format: true,
      premise: true,
      sourceVersion: true,
      rightsNote: true,
      isDemo: true,
      checkpoints: {
        select: checkpointMetadataSelect,
        orderBy: { ordinal: 'asc' },
      },
    },
  })
  if (!title) return null

  const viewing = await prisma.watchlistItem.findUnique({
    where: { userId_tmdbId: { userId, tmdbId: title.catalogId } },
    select: { progressPercent: true, currentSeason: true, currentEpisode: true, passportUpdatedAt: true },
  })

  const authorizedCheckpoint = viewing
    ? title.format === 'series'
      ? title.checkpoints.find(checkpoint =>
          checkpoint.season === viewing.currentSeason && checkpoint.episode === viewing.currentEpisode) ?? null
      : [...title.checkpoints]
          .reverse()
          .find(checkpoint => checkpoint.filmProgressPercent !== null && checkpoint.filmProgressPercent <= viewing.progressPercent) ?? null
    : null

  return { title, checkpoints: title.checkpoints, authorizedCheckpoint, viewing }
}

export async function getWhereWasISession(userId: string, slug: string): Promise<WhereWasISession | null> {
  const context = await loadAuthorizedContext(userId, slug)
  if (!context) return null
  const { title, checkpoints, authorizedCheckpoint } = context

  const checkpointList = checkpoints.map(publicCheckpoint)
  const shell = {
    title: {
      slug: title.slug,
      name: title.title,
      format: title.format,
      premise: title.premise,
      sourceVersion: title.sourceVersion,
      rightsNote: title.rightsNote,
      isDemo: title.isDemo,
    },
    checkpoints: checkpointList,
    authorizedCheckpoint: authorizedCheckpoint ? publicCheckpoint(authorizedCheckpoint) : null,
    modelConfigured: Boolean(process.env.OPENAI_API_KEY),
  }

  if (!authorizedCheckpoint) {
    return { ...shell, shortRecap: [], longRecap: [], characters: [], suggestedQuestions: [] }
  }

  // This is the security boundary: the database query excludes future rows
  // before evidence reaches ranking, caching, or the model.
  const [authorizedRecap, evidenceRows, snapshotRows] = await Promise.all([
    prisma.resumeCheckpoint.findFirst({
      where: { id: authorizedCheckpoint.id, titleId: title.id },
      select: { shortRecap: true, longRecap: true },
    }),
    prisma.resumeEvidence.findMany({
      where: {
        titleId: title.id,
        earliestCheckpoint: { ordinal: { lte: authorizedCheckpoint.ordinal } },
      },
      include: {
        earliestCheckpoint: {
          select: {
            ordinal: true,
            season: true,
            episode: true,
            filmProgressPercent: true,
          },
        },
      },
      orderBy: [{ earliestCheckpoint: { ordinal: 'desc' } }, { id: 'asc' }],
    }),
    prisma.resumeCharacterSnapshot.findMany({
      where: { checkpointId: authorizedCheckpoint.id, character: { titleId: title.id } },
      include: { character: { select: { id: true } } },
      orderBy: { displayName: 'asc' },
    }),
  ])

  const evidence = filterEvidenceAtBoundary(evidenceRows.map(toEvidence), authorizedCheckpoint.ordinal)
  const characters = snapshotRows.map(snapshot => ({
    id: snapshot.character.id,
    displayName: snapshot.displayName,
    viewerContext: resolveClaims(parseClaims(snapshot.viewerContext), evidence),
    relationships: resolveClaims(parseClaims(snapshot.relationships), evidence),
    characterKnowledge: resolveClaims(parseClaims(snapshot.characterKnowledge), evidence),
  }))

  const suggestedQuestions = characters.slice(0, 3).flatMap(character => [
    { label: `Who is ${character.displayName}?`, question: `Who is ${character.displayName}?`, characterId: character.id },
    { label: `What does ${character.displayName} know?`, question: `What does ${character.displayName} know right now?`, characterId: character.id },
  ]).slice(0, 4)

  return {
    ...shell,
    shortRecap: resolveClaims(parseClaims(authorizedRecap?.shortRecap ?? []), evidence),
    longRecap: resolveClaims(parseClaims(authorizedRecap?.longRecap ?? []), evidence),
    characters,
    suggestedQuestions,
  }
}

export async function setWhereWasIProgress(userId: string, slug: string, checkpointId: string) {
  const title = await prisma.resumeTitle.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      catalogId: true,
      title: true,
      format: true,
      checkpoints: {
        select: checkpointMetadataSelect,
        orderBy: { ordinal: 'asc' },
      },
    },
  })
  if (!title) throw new Error('TITLE_NOT_FOUND')
  const checkpoint = title.checkpoints.find(item => item.id === checkpointId)
  if (!checkpoint) throw new Error('CHECKPOINT_NOT_FOUND')

  const finalCheckpoint = title.checkpoints.at(-1)
  const finished = finalCheckpoint?.id === checkpoint.id
  const progressPercent = title.format === 'film'
    ? checkpoint.filmProgressPercent ?? 0
    : finished
      ? 100
      : Math.max(1, Math.min(99, Math.round((checkpoint.ordinal / title.checkpoints.length) * 100)))

  await prisma.$transaction(async tx => {
    await tx.watchlistItem.upsert({
      where: { userId_tmdbId: { userId, tmdbId: title.catalogId } },
      create: {
        userId,
        tmdbId: title.catalogId,
        title: title.title,
        genreIds: [],
        status: finished ? 'watched' : 'watching',
        progressPercent,
        currentSeason: title.format === 'series' ? checkpoint.season : null,
        currentEpisode: title.format === 'series' ? checkpoint.episode : null,
        passportUpdatedAt: new Date(),
        watchedAt: finished ? new Date() : null,
      },
      update: {
        status: finished ? 'watched' : 'watching',
        progressPercent,
        currentSeason: title.format === 'series' ? checkpoint.season : null,
        currentEpisode: title.format === 'series' ? checkpoint.episode : null,
        passportUpdatedAt: new Date(),
        watchedAt: finished ? new Date() : null,
      },
    })

    // A rollback must remove all derived output from checkpoints that are no
    // longer authorized. Questions are stateless, so there is no hidden chat
    // transcript to survive the boundary change.
    await tx.resumeAnswerCache.deleteMany({
      where: {
        userId,
        titleId: title.id,
        checkpoint: { ordinal: { gt: checkpoint.ordinal } },
      },
    })
  })

  return getWhereWasISession(userId, slug)
}

function validCachedAnswer(value: Prisma.JsonValue): GroundedAnswer | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const answer = value as unknown as Partial<GroundedAnswer>
  if ((answer.status !== 'supported' && answer.status !== 'insufficient') ||
      typeof answer.text !== 'string' || !Array.isArray(answer.evidenceIds) ||
      !Array.isArray(answer.references) ||
      (answer.method !== 'extractive' && answer.method !== 'model-selected')) return null
  return { ...answer, cached: true } as GroundedAnswer
}

export async function answerWhereWasIQuestion(
  userId: string,
  slug: string,
  questionInput: string,
  characterId?: string,
): Promise<{ answer: GroundedAnswer; checkpoint: WhereWasICheckpoint }> {
  const question = normalizeQuestion(questionInput)
  if (!question) throw new Error('INVALID_QUESTION')

  const context = await loadAuthorizedContext(userId, slug)
  if (!context) throw new Error('TITLE_NOT_FOUND')
  const { title, authorizedCheckpoint } = context
  if (!authorizedCheckpoint) throw new Error('PROGRESS_REQUIRED')

  let characterKey: string | null = null
  if (characterId) {
    const snapshot = await prisma.resumeCharacterSnapshot.findFirst({
      where: {
        checkpointId: authorizedCheckpoint.id,
        characterId,
        character: { titleId: title.id },
      },
      include: { character: { select: { stableKey: true } } },
    })
    if (!snapshot) throw new Error('CHARACTER_NOT_AVAILABLE')
    characterKey = snapshot.character.stableKey
  }

  const questionHash = createHash('sha256')
    .update(`${question.toLocaleLowerCase('en-US')}\u0000${characterId ?? ''}`)
    .digest('hex')
  const cacheKey = {
    userId_titleId_checkpointId_sourceVersion_questionHash: {
      userId,
      titleId: title.id,
      checkpointId: authorizedCheckpoint.id,
      sourceVersion: title.sourceVersion,
      questionHash,
    },
  }
  const cached = await prisma.resumeAnswerCache.findUnique({ where: cacheKey })
  const cachedAnswer = cached ? validCachedAnswer(cached.answer) : null
  if (cachedAnswer) return { answer: cachedAnswer, checkpoint: publicCheckpoint(authorizedCheckpoint) }

  // Never fetch all-series evidence and ask a prompt to behave. The SQL
  // relation filter is applied first and is enforced again in pure code.
  const evidenceRows = await prisma.resumeEvidence.findMany({
    where: {
      titleId: title.id,
      earliestCheckpoint: { ordinal: { lte: authorizedCheckpoint.ordinal } },
    },
    include: {
      earliestCheckpoint: {
        select: {
          ordinal: true,
          season: true,
          episode: true,
          filmProgressPercent: true,
        },
      },
    },
  })
  const allowedEvidence = filterEvidenceAtBoundary(evidenceRows.map(toEvidence), authorizedCheckpoint.ordinal)
  const candidates = rankEvidenceCandidates(question, allowedEvidence, { characterKey })
  const startedAt = Date.now()
  const modelAnswer = await selectGroundedEvidence(
    question,
    safeCheckpointLabel(authorizedCheckpoint),
    candidates,
  )
  const answer = modelAnswer ?? {
    ...buildExtractiveAnswer(question, allowedEvidence, { characterKey }),
    latencyMs: Date.now() - startedAt,
    estimatedCostMicros: 0,
  }

  // A user can roll progress back while an AI request is in flight. Re-read
  // the owned Plot Passport row before persisting or returning the result so a
  // slow response from the former boundary is discarded.
  const currentContext = await loadAuthorizedContext(userId, slug)
  if (currentContext?.authorizedCheckpoint?.id !== authorizedCheckpoint.id ||
      currentContext.viewing?.passportUpdatedAt?.getTime() !== context.viewing?.passportUpdatedAt?.getTime()) {
    throw new Error('BOUNDARY_CHANGED')
  }

  await prisma.resumeAnswerCache.upsert({
    where: cacheKey,
    create: {
      userId,
      titleId: title.id,
      checkpointId: authorizedCheckpoint.id,
      sourceVersion: title.sourceVersion,
      questionHash,
      answer: answer as unknown as Prisma.InputJsonValue,
      method: answer.method,
      model: answer.model ?? null,
      latencyMs: answer.latencyMs ?? 0,
      inputTokens: answer.inputTokens ?? null,
      outputTokens: answer.outputTokens ?? null,
      estimatedCostMicros: answer.estimatedCostMicros ?? null,
    },
    update: {},
  })

  return { answer, checkpoint: publicCheckpoint(authorizedCheckpoint) }
}
