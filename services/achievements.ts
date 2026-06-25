import { prisma } from '@/lib/db'
import { awardXP } from './xp'
import { notifyAchievement } from './notifications'
import type { Achievement, UserAchievementData } from '@/types'

// ─── Achievement definitions ──────────────────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  // ── Watching ──────────────────────────────────────────────────────────────
  {
    slug:        'first-watch',
    name:        'First Watch',
    description: 'Mark your first movie as watched. Every legend has a beginning.',
    icon:        '🎬',
    goal:        1,
    xpReward:    50,
    category:    'watching',
    rarity:      'common',
  },
  {
    slug:        'five-films',
    name:        'Getting Started',
    description: 'Watch 5 movies and start building your taste profile.',
    icon:        '🍿',
    goal:        5,
    xpReward:    75,
    category:    'watching',
    rarity:      'common',
  },
  {
    slug:        'ten-films',
    name:        'Film Enthusiast',
    description: 'Watch 10 movies. You\'re developing a real eye for film.',
    icon:        '🎭',
    goal:        10,
    xpReward:    100,
    category:    'watching',
    rarity:      'rare',
  },
  {
    slug:        'fifty-films',
    name:        'Cinephile',
    description: 'Watch 50 movies. You have devoted yourself to the craft.',
    icon:        '🏆',
    goal:        50,
    xpReward:    300,
    category:    'watching',
    rarity:      'epic',
  },
  {
    slug:        'century-club',
    name:        'The Century Club',
    description: 'Watch 100 movies. A true master of the silver screen.',
    icon:        '💯',
    goal:        100,
    xpReward:    500,
    category:    'watching',
    rarity:      'legendary',
  },
  {
    slug:        'watchlist-builder',
    name:        'Watchlist Builder',
    description: 'Add 20 movies to your watchlist. So many films, so little time.',
    icon:        '📋',
    goal:        20,
    xpReward:    100,
    category:    'watching',
    rarity:      'rare',
  },

  // ── Genres ────────────────────────────────────────────────────────────────
  {
    slug:        'genre-explorer',
    name:        'Genre Explorer',
    description: 'Watch movies from 5 different genres. Broaden your cinematic horizons.',
    icon:        '🌐',
    goal:        5,
    xpReward:    200,
    category:    'genres',
    rarity:      'epic',
  },

  // ── Discovery ─────────────────────────────────────────────────────────────
  {
    slug:        'dna-decoded',
    name:        'DNA Decoded',
    description: 'Complete your Movie DNA profile and unlock your taste fingerprint.',
    icon:        '🧬',
    goal:        1,
    xpReward:    75,
    category:    'discovery',
    rarity:      'common',
  },
  {
    slug:        'personality-found',
    name:        'Personality Found',
    description: 'Discover your Movie Personality type. Know thyself, cinephile.',
    icon:        '✨',
    goal:        1,
    xpReward:    75,
    category:    'discovery',
    rarity:      'common',
  },

  // ── Collections ───────────────────────────────────────────────────────────
  {
    slug:        'collector',
    name:        'The Collector',
    description: 'Create 3 movie collections. Curation is its own art form.',
    icon:        '📚',
    goal:        3,
    xpReward:    150,
    category:    'collections',
    rarity:      'rare',
  },

  // ── Social ────────────────────────────────────────────────────────────────
  {
    slug:        'social-butterfly',
    name:        'Social Butterfly',
    description: 'Follow 5 other users and discover new perspectives on film.',
    icon:        '🦋',
    goal:        5,
    xpReward:    100,
    category:    'social',
    rarity:      'rare',
  },
  {
    slug:        'trendsetter',
    name:        'Trendsetter',
    description: 'Gain 5 followers. Others trust your taste in film.',
    icon:        '⭐',
    goal:        5,
    xpReward:    150,
    category:    'social',
    rarity:      'epic',
  },
]

export function getAchievementBySlug(slug: string): Achievement | null {
  return ACHIEVEMENTS.find(a => a.slug === slug) ?? null
}

// ─── Get user achievements ────────────────────────────────────────────────────

export async function getUserAchievements(userId: string): Promise<UserAchievementData[]> {
  const existing = await prisma.userAchievement.findMany({ where: { userId } })
  const existingMap = new Map(existing.map(e => [e.slug, e]))

  return ACHIEVEMENTS.map(def => {
    const record = existingMap.get(def.slug)
    return {
      ...def,
      progress: record?.progress ?? 0,
      earned:   record?.earned ?? false,
      earnedAt: record?.earnedAt?.toISOString() ?? null,
    }
  })
}

// ─── Check + update achievements after a trigger ─────────────────────────────

type AchievementTrigger = 'watched_movie' | 'followed_user' | 'created_collection' | 'added_to_watchlist' | 'dna_updated' | 'personality_assigned' | 'gained_follower'

export async function checkAndUpdateAchievements(
  userId: string,
  trigger: AchievementTrigger,
): Promise<void> {
  const triggers: Record<AchievementTrigger, string[]> = {
    watched_movie:       ['first-watch', 'five-films', 'ten-films', 'fifty-films', 'century-club', 'genre-explorer'],
    followed_user:       ['social-butterfly'],
    created_collection:  ['collector'],
    added_to_watchlist:  ['watchlist-builder'],
    dna_updated:         ['dna-decoded'],
    personality_assigned:['personality-found'],
    gained_follower:     ['trendsetter'],
  }

  const relevantSlugs = triggers[trigger] ?? []
  if (relevantSlugs.length === 0) return

  for (const slug of relevantSlugs) {
    const def = getAchievementBySlug(slug)
    if (!def) continue

    const progress = await computeProgress(userId, slug)
    const earned   = progress >= def.goal

    const existing = await prisma.userAchievement.findUnique({ where: { userId_slug: { userId, slug } } })
    if (existing?.earned) continue // already earned

    await prisma.userAchievement.upsert({
      where:  { userId_slug: { userId, slug } },
      create: { userId, slug, progress, goal: def.goal, earned, earnedAt: earned ? new Date() : null },
      update: { progress, earned, earnedAt: earned && !existing?.earned ? new Date() : existing?.earnedAt, updatedAt: new Date() },
    })

    if (earned && !existing?.earned) {
      // Award XP, log activity, and notify — all non-blocking
      void Promise.all([
        awardXP(userId, def.xpReward, 'earned_achievement', { achievementName: def.name }),
        prisma.activityEvent.create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { userId, type: 'earned_achievement', data: { achievementName: def.name, achievementIcon: def.icon } as any },
        }).catch(() => {}),
        notifyAchievement(userId, slug, def.name).catch(() => {}),
      ])
    }
  }
}

// ─── Progress calculators per achievement ─────────────────────────────────────

async function computeProgress(userId: string, slug: string): Promise<number> {
  switch (slug) {
    case 'first-watch':
    case 'five-films':
    case 'ten-films':
    case 'fifty-films':
    case 'century-club': {
      return prisma.watchlistItem.count({ where: { userId, status: 'watched' } })
    }
    case 'watchlist-builder': {
      return prisma.watchlistItem.count({ where: { userId } })
    }
    case 'social-butterfly': {
      return prisma.userFollow.count({ where: { followerId: userId } })
    }
    case 'trendsetter': {
      return prisma.userFollow.count({ where: { followingId: userId } })
    }
    case 'collector': {
      return prisma.collection.count({ where: { userId } })
    }
    case 'dna-decoded': {
      const tp = await prisma.tasteProfile.findUnique({ where: { userId } })
      return tp ? 1 : 0
    }
    case 'personality-found': {
      const p = await prisma.userPersonality.findUnique({ where: { userId } })
      return p ? 1 : 0
    }
    case 'genre-explorer': {
      // Count distinct genre sets from watched movies
      const watched = await prisma.watchlistItem.findMany({
        where:  { userId, status: 'watched' },
        select: { genreIds: true },
      })
      const allGenres = new Set(watched.flatMap(w => w.genreIds ?? []))
      return Math.min(5, allGenres.size)
    }
    default:
      return 0
  }
}
