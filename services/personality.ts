import { prisma } from '@/lib/db'
import type { DNAScores, PersonalityType, PersonalitySlug, UserPersonalityData } from '@/types'

// ─── Personality type definitions ─────────────────────────────────────────────

export const PERSONALITY_TYPES: PersonalityType[] = [
  {
    slug:        'thinker',
    name:        'The Thinker',
    description: 'You seek films that challenge your mind and leave you questioning reality long after the credits roll.',
    icon:        '🧠',
    color:       'bg-violet-900/40',
    accentHex:   '#7C3AED',
    traits:      ['Intellectual', 'Philosophical', 'Nuanced', 'Patient'],
  },
  {
    slug:        'thriller-seeker',
    name:        'The Thriller Seeker',
    description: 'You live for tension, twists, and the adrenaline rush of not knowing what comes next.',
    icon:        '⚡',
    color:       'bg-red-900/40',
    accentHex:   '#DC2626',
    traits:      ['Intense', 'Edge-of-seat', 'Dark', 'Unpredictable'],
  },
  {
    slug:        'explorer',
    name:        'The Explorer',
    description: 'You roam across genres, languages, and eras — always hunting for something fresh and unexpected.',
    icon:        '🌍',
    color:       'bg-emerald-900/40',
    accentHex:   '#059669',
    traits:      ['Curious', 'Eclectic', 'Adventurous', 'Open-minded'],
  },
  {
    slug:        'story-analyst',
    name:        'The Story Analyst',
    description: 'Character arcs and emotional depth matter more to you than anything else. You feel films deeply.',
    icon:        '📖',
    color:       'bg-amber-900/40',
    accentHex:   '#D97706',
    traits:      ['Empathetic', 'Character-driven', 'Reflective', 'Emotional'],
  },
  {
    slug:        'entertainer',
    name:        'The Entertainer',
    description: 'Pure fun is the goal. You want big action, sharp humor, and films that leave you buzzing.',
    icon:        '🎬',
    color:       'bg-orange-900/40',
    accentHex:   '#EA580C',
    traits:      ['Fun-loving', 'High-energy', 'Crowd-pleaser', 'Optimistic'],
  },
  {
    slug:        'auteur',
    name:        'The Auteur',
    description: 'You appreciate cinema as art. Visual style, directorial vision, and subtext excite you.',
    icon:        '🎞️',
    color:       'bg-slate-800/60',
    accentHex:   '#475569',
    traits:      ['Artistic', 'Cinephile', 'Detail-oriented', 'Dark-leaning'],
  },
  {
    slug:        'escapist',
    name:        'The Escapist',
    description: 'Movies are your portal to other worlds. You love fantasy, wonder, and grand adventures.',
    icon:        '✨',
    color:       'bg-sky-900/40',
    accentHex:   '#0284C7',
    traits:      ['Imaginative', 'Wonder-seeking', 'Optimistic', 'Adventurous'],
  },
]

export function getPersonalityBySlug(slug: string): PersonalityType | null {
  return PERSONALITY_TYPES.find(t => t.slug === slug) ?? null
}

// ─── Classification algorithm ─────────────────────────────────────────────────
// Each type has a scoring profile: how much each DNA dimension contributes.
// We compute a weighted dot-product for each type and pick the top two.

interface TypeProfile {
  slug:    PersonalitySlug
  weights: Partial<Record<keyof DNAScores, number>>   // positive = favors this type
  negWeights: Partial<Record<keyof DNAScores, number>> // high score here hurts this type
}

const TYPE_PROFILES: TypeProfile[] = [
  {
    slug: 'thinker',
    weights:    { complexityScore: 3, realismScore: 2, emotionalImpactScore: 1.5, suspenseScore: 0.5 },
    negWeights: { humorScore: 1.5, actionScore: 1 },
  },
  {
    slug: 'thriller-seeker',
    weights:    { suspenseScore: 3, darknessScore: 2.5, complexityScore: 1 },
    negWeights: { humorScore: 1.5, realismScore: 0.5 },
  },
  {
    slug: 'explorer',
    weights:    {},
    negWeights: {}, // explorer is assigned when no single type dominates
    // handled specially below
  },
  {
    slug: 'story-analyst',
    weights:    { emotionalImpactScore: 3, realismScore: 1.5, complexityScore: 1 },
    negWeights: { actionScore: 1.5, humorScore: 0.5 },
  },
  {
    slug: 'entertainer',
    weights:    { actionScore: 3, humorScore: 2.5, suspenseScore: 0.5 },
    negWeights: { complexityScore: 1.5, darknessScore: 1 },
  },
  {
    slug: 'auteur',
    weights:    { complexityScore: 2.5, darknessScore: 2, realismScore: 1.5, suspenseScore: 1 },
    negWeights: { humorScore: 1.5, actionScore: 0.5 },
  },
  {
    slug: 'escapist',
    weights:    { actionScore: 1.5, emotionalImpactScore: 1.5, humorScore: 1 },
    negWeights: { realismScore: 2, darknessScore: 1.5, complexityScore: 0.5 },
  },
]

function scoreTypeForDNA(profile: TypeProfile, dna: DNAScores): number {
  let score = 0
  // Positive weights: high DNA score in these dimensions boosts this type
  for (const [key, weight] of Object.entries(profile.weights) as [keyof DNAScores, number][]) {
    score += ((dna[key] - 5) / 5) * weight  // normalize: 10 → +weight, 1 → -weight
  }
  // Negative weights: high DNA score here hurts this type
  for (const [key, weight] of Object.entries(profile.negWeights) as [keyof DNAScores, number][]) {
    score -= ((dna[key] - 5) / 5) * weight
  }
  return score
}

export function classifyPersonality(dna: DNAScores): {
  primary: PersonalitySlug
  secondary: PersonalitySlug | null
} {
  const scores = TYPE_PROFILES
    .filter(p => p.slug !== 'explorer')
    .map(profile => ({
      slug:  profile.slug,
      score: scoreTypeForDNA(profile, dna),
    }))
    .sort((a, b) => b.score - a.score)

  // Explorer: assigned as secondary if the spread is low (eclectic taste)
  const spread = scores[0].score - scores[scores.length - 1].score
  const isExplorer = spread < 1.5

  const primary = scores[0].slug
  let secondary: PersonalitySlug | null = null

  if (isExplorer) {
    secondary = 'explorer'
  } else if (scores[1].score > scores[0].score * 0.6) {
    secondary = scores[1].slug
  }

  return { primary, secondary }
}

// ─── DB operations ────────────────────────────────────────────────────────────

export async function assignPersonality(userId: string): Promise<UserPersonalityData> {
  // Need DNA scores
  const profile = await prisma.tasteProfile.findUnique({ where: { userId } })
  if (!profile) throw new Error('No taste profile found for user')

  const dna: DNAScores = {
    suspenseScore:        profile.suspenseScore,
    emotionalImpactScore: profile.emotionalImpactScore,
    complexityScore:      profile.complexityScore,
    humorScore:           profile.humorScore,
    realismScore:         profile.realismScore,
    actionScore:          profile.actionScore,
    darknessScore:        profile.darknessScore,
  }

  const { primary, secondary } = classifyPersonality(dna)

  const personality = await prisma.userPersonality.upsert({
    where:  { userId },
    create: { userId, primaryType: primary, secondaryType: secondary },
    update: { primaryType: primary, secondaryType: secondary, updatedAt: new Date() },
  })

  // Log activity
  const primaryTypeDef = getPersonalityBySlug(primary)
  await prisma.activityEvent.create({
    data: {
      userId,
      type: 'personality_assigned',
      data: { personalityName: primaryTypeDef?.name ?? primary },
    },
  }).catch(() => {}) // non-critical

  return {
    primaryType:   getPersonalityBySlug(personality.primaryType)!,
    secondaryType: personality.secondaryType ? getPersonalityBySlug(personality.secondaryType) : null,
    assignedAt:    personality.assignedAt.toISOString(),
  }
}

export async function getUserPersonality(userId: string): Promise<UserPersonalityData | null> {
  const personality = await prisma.userPersonality.findUnique({ where: { userId } })
  if (!personality) return null

  return {
    primaryType:   getPersonalityBySlug(personality.primaryType) ?? PERSONALITY_TYPES[0],
    secondaryType: personality.secondaryType ? getPersonalityBySlug(personality.secondaryType) : null,
    assignedAt:    personality.assignedAt.toISOString(),
  }
}
