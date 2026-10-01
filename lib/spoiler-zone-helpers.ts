/**
 * Shared helpers for Spoiler Zone API routes.
 * Imported by both:
 *   app/api/spoiler-zone/[tmdbId]/messages/route.ts
 *   app/api/spoiler-zone/[tmdbId]/messages/[messageId]/route.ts
 */

import type { SZMessageData, SZReactionGroup, SpoilerLevel } from '@/types'
import { canViewSpoilerLevel, requiredProgressForLevel } from '@/lib/plot-passport'
import { redactLockedText } from '@/lib/content-visibility'

export const VALID_SPOILER_LEVELS: SpoilerLevel[] = ['safe', 'mid', 'ending', 'theory', 'behind']

export function groupReactions(
  reactions: { emoji: string; userId: string }[],
  currentUserId: string | null,
): SZReactionGroup[] {
  const map = new Map<string, { count: number; userReacted: boolean }>()
  for (const r of reactions) {
    const prev = map.get(r.emoji) ?? { count: 0, userReacted: false }
    map.set(r.emoji, {
      count:       prev.count + 1,
      userReacted: prev.userReacted || r.userId === currentUserId,
    })
  }
  return Array.from(map.entries())
    .map(([emoji, d]) => ({ emoji, count: d.count, userReacted: d.userReacted }))
    .sort((a, b) => b.count - a.count)
}

export type MsgRow = {
  id:          string
  tmdbId:      number
  userId:      string
  content:     string
  editedAt:    Date | null
  isDeleted:   boolean
  isTheory:    boolean
  spoilerLevel: string
  parentId:    string | null
  isPinned:    boolean
  pinnedLabel: string | null
  voteScore:   number
  createdAt:   Date
  user:        { username: string; avatarUrl: string | null }
  reactions:   { emoji: string; userId: string }[]
  votes:       { type: string; userId: string }[]
  _count:      { replies: number }
  parent?:     {
    id: string
    userId: string
    spoilerLevel: string
    user: { username: string }
    content: string
  } | null
}

export function formatMessage(
  msg: MsgRow,
  currentUserId: string | null,
  viewerProgress = 0,
): SZMessageData {
  const viewerUnlocked = msg.userId === currentUserId ||
    canViewSpoilerLevel(msg.spoilerLevel, viewerProgress)
  const parentViewerUnlocked = msg.parent
    ? msg.parent.userId === currentUserId ||
      canViewSpoilerLevel(msg.parent.spoilerLevel, viewerProgress)
    : false
  return {
    id:            msg.id,
    tmdbId:        msg.tmdbId,
    userId:        msg.userId,
    username:      msg.user.username,
    avatarUrl:     msg.user.avatarUrl,
    // Locked content must never cross the server boundary. The client can make
    // a separate, explicit reveal request if the viewer chooses to bypass the
    // Plot Passport warning.
    content:       redactLockedText(msg.content, viewerUnlocked),
    editedAt:      msg.editedAt?.toISOString() ?? null,
    isDeleted:     msg.isDeleted,
    isTheory:      msg.isTheory,
    spoilerLevel:  (msg.spoilerLevel ?? 'safe') as SZMessageData['spoilerLevel'],
    viewerUnlocked,
    unlockAtProgress: requiredProgressForLevel(msg.spoilerLevel),
    parentId:      msg.parentId,
    parentPreview: msg.parent
      ? {
          id: msg.parent.id,
          username: msg.parent.user.username,
          content: parentViewerUnlocked
            ? redactLockedText(msg.parent.content.slice(0, 120), true)
            : 'Locked by Plot Passport',
        }
      : null,
    isPinned:      msg.isPinned,
    pinnedLabel:   msg.pinnedLabel,
    voteScore:     msg.voteScore,
    userVote:      (msg.votes.find(v => v.userId === currentUserId)?.type as 'upvote' | 'downvote') ?? null,
    reactions:     groupReactions(msg.reactions, currentUserId),
    replyCount:    msg._count.replies,
    createdAt:     msg.createdAt.toISOString(),
  }
}

export const MSG_INCLUDE = {
  user:      { select: { username: true, avatarUrl: true } },
  reactions: { select: { emoji: true, userId: true } },
  votes:     { select: { type: true, userId: true } },
  _count:    { select: { replies: true } },
  parent: {
    select: {
      id: true, userId: true, spoilerLevel: true, content: true,
      user: { select: { username: true } },
    },
  },
} as const
