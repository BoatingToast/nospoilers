import { prisma } from '@/lib/db'
import type { XPLevel } from '@/types'

// ─── Level definitions ────────────────────────────────────────────────────────

const LEVELS = [
  { level: 1, title: 'Film Novice',        minXP: 0    },
  { level: 2, title: 'Casual Viewer',      minXP: 100  },
  { level: 3, title: 'Movie Fan',          minXP: 250  },
  { level: 4, title: 'Cinema Enthusiast',  minXP: 500  },
  { level: 5, title: 'Film Buff',          minXP: 1000 },
  { level: 6, title: 'Cinephile',          minXP: 2000 },
  { level: 7, title: 'Film Legend',        minXP: 5000 },
]

export function getLevelFromXP(totalXP: number): XPLevel {
  let levelData = LEVELS[0]
  for (const l of LEVELS) {
    if (totalXP >= l.minXP) levelData = l
    else break
  }

  const idx     = LEVELS.indexOf(levelData)
  const nextLevel = LEVELS[idx + 1]
  const currentXP = totalXP - levelData.minXP
  const rangeXP   = nextLevel ? nextLevel.minXP - levelData.minXP : 999999
  const progress  = nextLevel ? Math.min(100, Math.round((currentXP / rangeXP) * 100)) : 100

  return {
    level:     levelData.level,
    title:     levelData.title,
    minXP:     levelData.minXP,
    maxXP:     nextLevel?.minXP ?? 9999,
    currentXP,
    totalXP,
    progress,
  }
}

// ─── Award XP ─────────────────────────────────────────────────────────────────

export async function awardXP(
  userId: string,
  amount: number,
  reason: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  await prisma.xPEvent.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { userId, amount, reason, meta: (meta ?? null) as any },
  }).catch(() => {})
}

// ─── Get user XP + level ──────────────────────────────────────────────────────

export async function getUserXP(userId: string): Promise<XPLevel> {
  const events = await prisma.xPEvent.findMany({ where: { userId }, select: { amount: true } })
  const total  = events.reduce((sum, e) => sum + e.amount, 0)
  return getLevelFromXP(total)
}
