import { prisma } from '@/lib/db'
import { AUDIENCE_CONSENT_VERSION, FACETS, MEDIA_TYPES, rateInterval } from '@/lib/audience-engine'
import { collectionPriorities } from '@/lib/audience-insights'

type MediaRow = {
  medium: string
  works: bigint
  participants: bigint
  exposed: bigint
  interested: bigint
  responses: bigint
  positive: bigint
  rating: number | null
}

export async function audienceDirection(days = 30) {
  const since = new Date(Date.now() - days * 86400_000)
  const [
    funnel,
    eligibleWorks,
    pending,
    media,
    sources,
    interests,
    health,
    alignment,
    newUsers,
    onboarded,
    raters,
    watchlisters,
    imports,
    recFeedback,
  ] = await Promise.all([
    prisma.$queryRaw<
      Array<{ enrolled: bigint; exposed: bigint; responses: bigint }>
    >`SELECT count(*) AS enrolled, count(*) FILTER (WHERE "exposedAt" IS NOT NULL) AS exposed, count(*) FILTER (WHERE "feedbackAt" IS NOT NULL) AS responses FROM "AudienceParticipant" WHERE quality <> 'excluded'`,
    prisma.$queryRaw<
      Array<{ works: bigint; responses: bigint; people: bigint }>
    >`SELECT count(DISTINCT p."workId") AS works, count(*) AS responses, count(DISTINCT a."userId") AS people FROM "AudienceParticipant" a JOIN "AudienceProject" p ON a."projectId" = p.id WHERE "reuseConsent" = true AND quality = 'accepted' AND "feedbackAt" IS NOT NULL AND "exposedAt" IS NOT NULL`,
    prisma.audienceParticipant.count({ where: { quality: 'pending', feedbackAt: { not: null } } }),
    prisma.$queryRaw<
      MediaRow[]
    >`SELECT p."mediaType" AS medium, count(DISTINCT p."workId") AS works, count(a.id) AS participants,
      count(*) FILTER (WHERE a."exposedAt" IS NOT NULL) AS exposed,
      count(*) FILTER (WHERE a."interestedAt" IS NOT NULL) AS interested,
      count(*) FILTER (WHERE a."feedbackAt" IS NOT NULL) AS responses,
      count(*) FILTER (WHERE a.rating >= 4) AS positive, avg(a.rating)::float AS rating
      FROM "AudienceProject" p JOIN "AudienceParticipant" a ON a."projectId" = p.id
      WHERE a."reuseConsent" = true AND a.quality = 'accepted' AND a."feedbackAt" IS NOT NULL AND a."exposedAt" IS NOT NULL GROUP BY p."mediaType"`,
    prisma.audienceParticipant.groupBy({
      by: ['source'],
      where: {
        quality: 'accepted',
        reuseConsent: true,
        feedbackAt: { not: null },
        exposedAt: { not: null },
      },
      _count: true,
    }),
    prisma.audienceParticipant.groupBy({
      by: ['primaryInterest'],
      where: {
        quality: 'accepted',
        reuseConsent: true,
        feedbackAt: { not: null },
        exposedAt: { not: null },
      },
      _count: true,
    }),
    prisma.$queryRaw<
      Array<{
        total: bigint
        wrongConsent: bigint
        missingExposure: bigint
        invalidAssignment: bigint
        badScales: bigint
        invalidFacets: bigint
        affected: bigint
      }>
    >`WITH checks AS (
      SELECT *, "consentVersion" <> ${AUDIENCE_CONSENT_VERSION} AS wrong_consent,
      ("feedbackAt" IS NOT NULL AND "exposedAt" IS NULL) AS missing_exposure,
      ("assignmentProbability" <= 0 OR "assignmentProbability" > 1) AS invalid_assignment,
      ("feedbackAt" IS NOT NULL AND (rating IS NULL OR rating NOT BETWEEN 1 AND 5 OR intent IS NULL OR intent NOT BETWEEN 1 AND 5 OR expectation IS NULL OR expectation NOT BETWEEN 1 AND 5)) AS bad_scales,
      (jsonb_typeof(facets) <> 'object' OR NOT facets ?& ARRAY['atmosphere','relationships','ideas','tension','humor','spectacle'] OR EXISTS (SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(facets) = 'object' THEN facets ELSE '{}'::jsonb END) f WHERE f.key IN ('atmosphere','relationships','ideas','tension','humor','spectacle') AND (jsonb_typeof(f.value) <> 'number' OR CASE WHEN jsonb_typeof(f.value) = 'number' THEN (f.value::text)::numeric NOT BETWEEN 1 AND 10 ELSE true END))) AS invalid_facets
      FROM "AudienceParticipant")
      SELECT count(*) AS total, count(*) FILTER (WHERE wrong_consent) AS "wrongConsent", count(*) FILTER (WHERE missing_exposure) AS "missingExposure", count(*) FILTER (WHERE invalid_assignment) AS "invalidAssignment", count(*) FILTER (WHERE bad_scales) AS "badScales", count(*) FILTER (WHERE invalid_facets) AS "invalidFacets", count(*) FILTER (WHERE wrong_consent OR missing_exposure OR invalid_assignment OR bad_scales OR invalid_facets) AS affected FROM checks`,
    prisma.$queryRaw<
      Array<{
        band: string
        responses: bigint
        positive: bigint
        interested: bigint
        rating: number | null
      }>
    >`SELECT "fitBand" AS band, count(*) AS responses, count(*) FILTER (WHERE rating >= 4) AS positive, count(*) FILTER (WHERE "interestedAt" IS NOT NULL) AS interested, avg(rating)::float AS rating FROM "AudienceParticipant" WHERE quality = 'accepted' AND "reuseConsent" = true AND "feedbackAt" IS NOT NULL AND "exposedAt" IS NOT NULL GROUP BY "fitBand"`,
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { createdAt: { gte: since }, onboardingCompleted: true } }),
    prisma.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT count(DISTINCT "userId") AS count FROM "MovieRating" WHERE "createdAt" >= ${since}`,
    prisma.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT count(DISTINCT "userId") AS count FROM "WatchlistItem" WHERE "addedAt" >= ${since}`,
    prisma.importBatch.groupBy({
      by: ['status'],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    prisma.recommendationFeedback.groupBy({
      by: ['feedback'],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
  ])
  const counts = {
    enrollments: Number(funnel[0]?.enrolled ?? 0),
    exposed: Number(funnel[0]?.exposed ?? 0),
    responses: Number(funnel[0]?.responses ?? 0),
    pending,
    eligible: Number(eligibleWorks[0]?.responses ?? 0),
    eligibleWorks: Number(eligibleWorks[0]?.works ?? 0),
    validationIssues: Number(health[0]?.affected ?? 0),
    sources: sources.map((s) => ({ label: s.source, count: s._count })),
  }
  return {
    days,
    generatedAt: new Date().toISOString(),
    priorities: collectionPriorities(counts),
    counts,
    uniqueContributors: Number(eligibleWorks[0]?.people ?? 0),
    media: MEDIA_TYPES.map((medium) => {
      const row = media.find((r) => r.medium === medium)
      const responses = Number(row?.responses ?? 0)
      return {
        medium,
        works: Number(row?.works ?? 0),
        responses,
        exposed: Number(row?.exposed ?? 0),
        interested: Number(row?.interested ?? 0),
        positive: Number(row?.positive ?? 0),
        averageRating: responses >= 5 ? (row?.rating ?? null) : null,
        interestRate: rateInterval(Number(row?.interested ?? 0), Number(row?.exposed ?? 0)),
        evidence:
          Number(row?.works ?? 0) < 3
            ? 'Needs more works'
            : responses < 100
              ? 'Needs more responses'
              : 'Ready to plan validation',
      }
    }),
    interests: FACETS.map((facet) => ({
      label: facet,
      count: interests.find((r) => r.primaryInterest === facet)?._count ?? 0,
    })),
    health: {
      total: Number(health[0]?.total ?? 0),
      issues: [
        { label: 'Consent version mismatch', count: Number(health[0]?.wrongConsent ?? 0) },
        { label: 'Feedback missing exposure', count: Number(health[0]?.missingExposure ?? 0) },
        {
          label: 'Invalid assignment probability',
          count: Number(health[0]?.invalidAssignment ?? 0),
        },
        { label: 'Incomplete or invalid outcome scales', count: Number(health[0]?.badScales ?? 0) },
        {
          label: 'Missing or invalid preference dimensions',
          count: Number(health[0]?.invalidFacets ?? 0),
        },
      ],
    },
    alignment: ['close', 'adjacent', 'exploring'].map((band) => {
      const row = alignment.find((r) => r.band === band)
      const responses = Number(row?.responses ?? 0)
      return {
        band,
        responses,
        positiveRate: rateInterval(Number(row?.positive ?? 0), responses),
        averageRating: responses >= 5 ? (row?.rating ?? null) : null,
      }
    }),
    product: {
      newUsers,
      onboarded,
      activeRaters: Number(raters[0]?.count ?? 0),
      watchlisters: Number(watchlisters[0]?.count ?? 0),
      imports: imports.map((r) => ({ label: r.status, count: r._count })),
      recommendationFeedback: recFeedback.map((r) => ({ label: r.feedback, count: r._count })),
    },
  }
}
