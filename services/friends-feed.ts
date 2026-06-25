/**
 * Social Activity Feed
 * ──────────────────────
 * Fetches the activity stream for all users the current user follows,
 * filtered by each user's privacy settings.
 *
 * Privacy: "public" activities show to everyone;
 *          "friends" activities show only to mutual friends;
 *          "private" activities are hidden from everyone else.
 */

import { prisma } from '@/lib/db'
import { getFriendIds } from './friends'
import type { ActivityEventItem } from '@/types'

export interface FriendFeedItem extends ActivityEventItem {
  authorUsername:  string
  authorAvatarUrl: string | null
  likeCount:       number
  userLiked:       boolean
}

export const FEED_ACTIVITY_TYPES = [
  'rated_movie',
  'added_to_watchlist',
  'created_collection',
  'earned_achievement',
  'added_favorite',
  'personality_assigned',
  'onboarding_completed',
  'followed_user',
  'joined_spoiler_zone',
  'updated_top_five',
  'watched_movie',
] as const

export async function getFriendsFeed(
  userId: string,
  limit = 40,
): Promise<FriendFeedItem[]> {
  // Fetch both follows (for "public" activity) and friends (for "friends" activity)
  const [followedRows, friendIds] = await Promise.all([
    prisma.userFollow.findMany({
      where:  { followerId: userId },
      select: { followingId: true },
    }),
    getFriendIds(userId),
  ])

  const followedIds = followedRows.map(r => r.followingId)
  if (followedIds.length === 0) return []

  const friendSet = new Set(friendIds)

  // Fetch privacy settings for all followed users
  const privacyRows = await prisma.userPrivacy.findMany({
    where:  { userId: { in: followedIds } },
    select: { userId: true, activity: true },
  })
  const privacyMap = new Map(privacyRows.map(p => [p.userId, p.activity]))

  // Determine which users' activity is visible
  const visibleIds = followedIds.filter(fid => {
    const setting = privacyMap.get(fid) ?? 'public'
    if (setting === 'private')  return false
    if (setting === 'friends')  return friendSet.has(fid)  // only show if also friends
    return true  // 'public'
  })

  if (visibleIds.length === 0) return []

  // Batch: users + events + like counts in parallel
  const [users, events] = await Promise.all([
    prisma.user.findMany({
      where:  { id: { in: visibleIds } },
      select: { id: true, username: true, avatarUrl: true },
    }),
    prisma.activityEvent.findMany({
      where: {
        userId: { in: visibleIds },
        type:   { in: [...FEED_ACTIVITY_TYPES] },
      },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    }),
  ])

  const userMap = new Map(users.map(u => [u.id, { username: u.username, avatarUrl: u.avatarUrl }]))

  // Fetch like counts for these events + whether viewer liked each
  const eventIds = events.map(e => e.id)
  const [likeCounts, userLikes] = await Promise.all([
    prisma.activityLike.groupBy({
      by:     ['activityEventId'],
      where:  { activityEventId: { in: eventIds } },
      _count: { id: true },
    }),
    prisma.activityLike.findMany({
      where: { activityEventId: { in: eventIds }, userId },
      select: { activityEventId: true },
    }),
  ])
  const likeCountMap = new Map(likeCounts.map(r => [r.activityEventId, r._count.id]))
  const likedSet     = new Set(userLikes.map(r => r.activityEventId))

  return events.map(e => {
    const author = userMap.get(e.userId)
    return {
      id:              e.id,
      type:            e.type,
      data:            e.data as Record<string, unknown>,
      createdAt:       e.createdAt.toISOString(),
      authorUsername:  author?.username  ?? 'someone',
      authorAvatarUrl: author?.avatarUrl ?? null,
      likeCount:       likeCountMap.get(e.id) ?? 0,
      userLiked:       likedSet.has(e.id),
    }
  })
}
