import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Prisma, PrismaClient } from '@prisma/client'
// @ts-expect-error explicit TypeScript extension is intentional for the Node runner
import { containsSourceInjection, type EvidenceClaim } from '../lib/where-was-i.ts'

interface CheckpointInput {
  id: string
  ordinal: number
  season?: number
  episode?: number
  filmProgressPercent?: number
  label: string
  shortRecap: EvidenceClaim[]
  longRecap: EvidenceClaim[]
}

interface SnapshotInput {
  checkpointId: string
  displayName: string
  viewerContext: EvidenceClaim[]
  relationships: EvidenceClaim[]
  characterKnowledge: EvidenceClaim[]
}

interface CorpusInput {
  schemaVersion: number
  title: {
    slug: string
    catalogId: number
    title: string
    format: 'series' | 'film'
    premise: string
    sourceVersion: number
    rightsNote: string
    totalSeasons?: number
    totalEpisodes?: number
    isDemo?: boolean
  }
  checkpoints: CheckpointInput[]
  evidence: Array<{
    id: string
    earliestCheckpointId: string
    kind: string
    characterKey?: string
    text: string
    sourceLabel: string
    sourceRef: string
    sourceExcerpt: string
  }>
  characters: Array<{ stableKey: string; snapshots: SnapshotInput[] }>
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`)
}

function assertClaims(
  claims: unknown,
  label: string,
  evidenceOrdinal: Map<string, number>,
  checkpointOrdinal: number,
) {
  if (!Array.isArray(claims)) throw new Error(`${label} must be an array`)
  for (const [index, raw] of claims.entries()) {
    const claim = raw as Partial<EvidenceClaim>
    assertString(claim.text, `${label}[${index}].text`)
    if (containsSourceInjection(claim.text)) throw new Error(`${label}[${index}] resembles prompt instructions`)
    if (!Array.isArray(claim.evidenceIds) || claim.evidenceIds.length === 0) {
      throw new Error(`${label}[${index}] needs at least one evidence ID`)
    }
    for (const id of claim.evidenceIds) {
      const earliest = evidenceOrdinal.get(id)
      if (earliest === undefined) throw new Error(`${label}[${index}] references missing evidence ${id}`)
      if (earliest > checkpointOrdinal) {
        throw new Error(`${label}[${index}] leaks future evidence ${id}`)
      }
    }
  }
}

export function validateCorpus(raw: unknown): CorpusInput {
  if (!raw || typeof raw !== 'object') throw new Error('Corpus must be an object')
  const corpus = raw as CorpusInput
  if (corpus.schemaVersion !== 1) throw new Error('Unsupported corpus schemaVersion')
  assertString(corpus.title?.slug, 'title.slug')
  assertString(corpus.title?.title, 'title.title')
  assertString(corpus.title?.premise, 'title.premise')
  assertString(corpus.title?.rightsNote, 'title.rightsNote')
  if (!Number.isInteger(corpus.title.catalogId)) throw new Error('title.catalogId must be an integer')
  if (corpus.title.format !== 'series' && corpus.title.format !== 'film') throw new Error('Unsupported title format')
  if (!Array.isArray(corpus.checkpoints) || corpus.checkpoints.length === 0) throw new Error('At least one checkpoint is required')
  if (!Array.isArray(corpus.evidence) || corpus.evidence.length === 0) throw new Error('At least one evidence item is required')
  if (!Array.isArray(corpus.characters)) throw new Error('characters must be an array')

  const checkpointOrdinal = new Map<string, number>()
  for (const checkpoint of corpus.checkpoints) {
    assertString(checkpoint.id, 'checkpoint.id')
    assertString(checkpoint.label, `${checkpoint.id}.label`)
    if (!Number.isInteger(checkpoint.ordinal) || checkpoint.ordinal < 1) throw new Error(`${checkpoint.id}.ordinal is invalid`)
    if (checkpointOrdinal.has(checkpoint.id)) throw new Error(`Duplicate checkpoint ${checkpoint.id}`)
    checkpointOrdinal.set(checkpoint.id, checkpoint.ordinal)
    if (corpus.title.format === 'series' &&
        (!Number.isInteger(checkpoint.season) || !Number.isInteger(checkpoint.episode))) {
      throw new Error(`${checkpoint.id} needs a season and completed episode`)
    }
    if (corpus.title.format === 'film' &&
        (!Number.isInteger(checkpoint.filmProgressPercent) || checkpoint.filmProgressPercent! < 0 || checkpoint.filmProgressPercent! > 100)) {
      throw new Error(`${checkpoint.id} needs a supported film checkpoint percentage`)
    }
  }

  const evidenceOrdinal = new Map<string, number>()
  for (const evidence of corpus.evidence) {
    assertString(evidence.id, 'evidence.id')
    assertString(evidence.text, `${evidence.id}.text`)
    assertString(evidence.sourceLabel, `${evidence.id}.sourceLabel`)
    assertString(evidence.sourceRef, `${evidence.id}.sourceRef`)
    assertString(evidence.sourceExcerpt, `${evidence.id}.sourceExcerpt`)
    if (containsSourceInjection(`${evidence.text}\n${evidence.sourceExcerpt}`)) {
      throw new Error(`${evidence.id} resembles prompt instructions and was rejected`)
    }
    const earliest = checkpointOrdinal.get(evidence.earliestCheckpointId)
    if (earliest === undefined) throw new Error(`${evidence.id} has an unknown earliest checkpoint`)
    if (evidenceOrdinal.has(evidence.id)) throw new Error(`Duplicate evidence ${evidence.id}`)
    evidenceOrdinal.set(evidence.id, earliest)
  }

  for (const checkpoint of corpus.checkpoints) {
    assertClaims(checkpoint.shortRecap, `${checkpoint.id}.shortRecap`, evidenceOrdinal, checkpoint.ordinal)
    assertClaims(checkpoint.longRecap, `${checkpoint.id}.longRecap`, evidenceOrdinal, checkpoint.ordinal)
  }

  const characterKeys = new Set<string>()
  for (const character of corpus.characters) {
    assertString(character.stableKey, 'character.stableKey')
    if (characterKeys.has(character.stableKey)) throw new Error(`Duplicate character ${character.stableKey}`)
    characterKeys.add(character.stableKey)
    if (!Array.isArray(character.snapshots) || character.snapshots.length === 0) {
      throw new Error(`${character.stableKey} needs checkpoint snapshots`)
    }
    const seenSnapshots = new Set<string>()
    for (const snapshot of character.snapshots) {
      const ordinal = checkpointOrdinal.get(snapshot.checkpointId)
      if (ordinal === undefined) throw new Error(`${character.stableKey} has an unknown snapshot checkpoint`)
      if (seenSnapshots.has(snapshot.checkpointId)) throw new Error(`${character.stableKey} has a duplicate snapshot`)
      seenSnapshots.add(snapshot.checkpointId)
      assertString(snapshot.displayName, `${character.stableKey}.displayName`)
      assertClaims(snapshot.viewerContext, `${character.stableKey}.viewerContext`, evidenceOrdinal, ordinal)
      assertClaims(snapshot.relationships, `${character.stableKey}.relationships`, evidenceOrdinal, ordinal)
      assertClaims(snapshot.characterKnowledge, `${character.stableKey}.characterKnowledge`, evidenceOrdinal, ordinal)
    }
  }

  return corpus
}

export async function ingestCorpus(prisma: PrismaClient, corpus: CorpusInput) {
  const data = validateCorpus(corpus)
  return prisma.$transaction(async tx => {
    const existing = await tx.resumeTitle.findUnique({ where: { slug: data.title.slug } })
    if (existing) {
      await tx.resumeAnswerCache.deleteMany({ where: { titleId: existing.id } })
      await tx.resumeCharacter.deleteMany({ where: { titleId: existing.id } })
      await tx.resumeEvidence.deleteMany({ where: { titleId: existing.id } })
      await tx.resumeCheckpoint.deleteMany({ where: { titleId: existing.id } })
    }

    const title = await tx.resumeTitle.upsert({
      where: { slug: data.title.slug },
      create: data.title,
      update: data.title,
    })

    await tx.resumeCheckpoint.createMany({
      data: data.checkpoints.map(checkpoint => ({
        id: checkpoint.id,
        titleId: title.id,
        ordinal: checkpoint.ordinal,
        season: checkpoint.season ?? null,
        episode: checkpoint.episode ?? null,
        filmProgressPercent: checkpoint.filmProgressPercent ?? null,
        label: checkpoint.label,
        shortRecap: checkpoint.shortRecap as unknown as Prisma.InputJsonValue,
        longRecap: checkpoint.longRecap as unknown as Prisma.InputJsonValue,
      })),
    })

    await tx.resumeEvidence.createMany({
      data: data.evidence.map(evidence => ({
        id: evidence.id,
        titleId: title.id,
        earliestCheckpointId: evidence.earliestCheckpointId,
        kind: evidence.kind,
        characterKey: evidence.characterKey ?? null,
        text: evidence.text,
        sourceLabel: evidence.sourceLabel,
        sourceRef: evidence.sourceRef,
        sourceExcerpt: evidence.sourceExcerpt,
      })),
    })

    for (const characterInput of data.characters) {
      const character = await tx.resumeCharacter.create({
        data: { titleId: title.id, stableKey: characterInput.stableKey },
      })
      await tx.resumeCharacterSnapshot.createMany({
        data: characterInput.snapshots.map(snapshot => ({
          id: `${data.title.slug}:${characterInput.stableKey}:${snapshot.checkpointId}`,
          characterId: character.id,
          checkpointId: snapshot.checkpointId,
          displayName: snapshot.displayName,
          viewerContext: snapshot.viewerContext as unknown as Prisma.InputJsonValue,
          relationships: snapshot.relationships as unknown as Prisma.InputJsonValue,
          characterKnowledge: snapshot.characterKnowledge as unknown as Prisma.InputJsonValue,
        })),
      })
    }

    return {
      title: title.title,
      checkpoints: data.checkpoints.length,
      evidence: data.evidence.length,
      characterSnapshots: data.characters.reduce((sum, character) => sum + character.snapshots.length, 0),
      sourceVersion: title.sourceVersion,
    }
  })
}

async function main() {
  const inputPath = resolve(process.argv[2] ?? 'data/where-was-i/the-signal-at-kestrel.json')
  const raw = JSON.parse(await readFile(inputPath, 'utf8')) as unknown
  const prisma = new PrismaClient()
  try {
    const result = await ingestCorpus(prisma, validateCorpus(raw))
    console.log(JSON.stringify({ input: pathToFileURL(inputPath).href, ...result }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  main().catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}
