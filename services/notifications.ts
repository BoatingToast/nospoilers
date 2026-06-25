/**
 * Notification Service
 * ──────────────────────────────────────────────────────────────────────────────
 * Centralised hub for every notification in NoSpoilers.
 * Any feature can import a typed helper and fire it — no duplicated logic.
 *
 * Payload is stored in the existing `metadata` JSON column, so no schema change
 * is needed. The metadata shape is:
 *   { title, body, link, icon, ...extra }
 *
 * Notification types and their metadata:
 *
 *  new_follower       { username }
 *  new_friend         { username }
 *  collection_upvote  { collectionId, collectionName, title, body, link }
 *  review_reply       { reviewId, movieTitle, replyUsername, title, body, link }
 *  achievement        { achievementSlug, achievementName, title, body, link }
 *  dna_evolved        { from, to, title, body, link }
 *  recs_refreshed     { count, title, body, link }
 *  friend_activity    { activityType, movieTitle, value, actorUsername, title, body, link }
 *  mention            { href, title, body, link }
 *  collection_invite  { collectionId, collectionName }
 *  sz_invite          { tmdbId, movieTitle }
 */

import { prisma } from '@/lib/db'

// ── Types ──────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'new_follower'
  | 'new_friend'
  | 'collection_upvote'
  | 'review_reply'
  | 'achievement'
  | 'dna_evolved'
  | 'recs_refreshed'
  | 'friend_activity'
  | 'mention'
  | 'collection_invite'
  | 'sz_invite'

export interface NotificationItem {
  id:             string
  type:           NotificationType
  actorId:        string | null
  actorUsername:  string | null
  actorAvatarUrl: string | null
  title:          string
  body:           string
  link:           string
  icon:           string          // icon key → looked up by the Bell component
  metadata:       Record<string, unknown>
  read:           boolean
  createdAt:      string
}

export interface NotificationPrefs {
  newFollowers:       boolean
  newFriends:         boolean
  friendActivity:     boolean
  collectionUpvotes:  boolean
  reviewReplies:      boolean
  achievementUnlocks: boolean
  dnaUpdates:         boolean
  recsRefreshed:      boolean
}

// ── Icon / copy resolvers ─────────────────────────────────────────────────────

/** Given a stored row, resolve the display title, body, link and icon.
 *  Falls back to metadata fields if they were pre-written at creation time. */
export function resolveNotification(
  type:     NotificationType,
  metadata: Record<string, unknown>,
  actorUsername: string | null,
): { title: string; body: string; link: string; icon: string } {
  const actor = actorUsername ? `@${actorUsername}` : 'Someone'

  switch (type) {
    case 'new_follower':
      return {
        title: 'New Follower',
        body:  `${actor} started following you.`,
        link:  `/profile/${actorUsername ?? ''}`,
        icon:  'person',
      }
    case 'new_friend':
      return {
        title: 'New Friend',
        body:  `You and ${actor} are now friends.`,
        link:  `/profile/${actorUsername ?? ''}`,
        icon:  'friends',
      }
    case 'collection_upvote':
      return {
        title: 'Collection Upvoted',
        body:  `Your collection "${metadata.collectionName ?? 'Untitled'}" received a new upvote.`,
        link:  `/collections/${metadata.collectionId ?? ''}`,
        icon:  'collections',
      }
    case 'review_reply':
      return {
        title: 'New Reply',
        body:  `${actor} replied to your review of ${metadata.movieTitle ?? 'a movie'}.`,
        link:  `/movie/${metadata.tmdbId ?? ''}#reviews`,
        icon:  'reviews',
      }
    case 'achievement':
      return {
        title: 'Achievement Unlocked',
        body:  `You earned "${metadata.achievementName ?? 'an achievement'}".`,
        link:  `/achievements`,
        icon:  'achievements',
      }
    case 'dna_evolved':
      return {
        title: 'Movie DNA Evolved',
        body:  metadata.from && metadata.to
          ? `Your personality shifted from ${metadata.from} to ${metadata.to}.`
          : 'Your Movie DNA has been updated.',
        link:  `/dashboard`,
        icon:  'dna',
      }
    case 'recs_refreshed':
      return {
        title: 'Recommendations Updated',
        body:  metadata.count
          ? `${metadata.count} new movies match your taste.`
          : 'We updated your recommendations.',
        link:  `/my-recommendations`,
        icon:  'recs',
      }
    case 'friend_activity': {
      const t = metadata.activityType as string | undefined
      let body = `${actor} was active.`
      if (t === 'rated_movie')      body = `${actor} rated ${metadata.movieTitle ?? 'a movie'} ${metadata.value ?? ''}/10.`
      if (t === 'added_favorite')   body = `${actor} added ${metadata.movieTitle ?? 'a film'} to their favourites.`
      if (t === 'updated_top_five') body = `${actor} updated their Top 5 Films.`
      if (t === 'earned_achievement') body = `${actor} unlocked "${metadata.achievementName ?? 'an achievement'}".`
      return { title: 'Friend Activity', body, link: `/profile/${actorUsername ?? ''}`, icon: 'friends' }
    }
    case 'mention':
      return {
        title: 'You Were Mentioned',
        body:  `${actor} mentioned you in a Spoiler Zone.`,
        link:  (metadata.href as string | undefined) ?? '/',
        icon:  'spoilerzone',
      }
    case 'collection_invite':
      return {
        title: 'Collection Invite',
        body:  `${actor} invited you to collaborate on "${metadata.collectionName ?? 'a collection'}".`,
        link:  `/collections/${metadata.collectionId ?? ''}`,
        icon:  'collections',
      }
    case 'sz_invite':
      return {
        title: 'Spoiler Zone Invite',
        body:  `${actor} invited you to the ${metadata.movieTitle ?? 'a'} Spoiler Zone.`,
        link:  `/movie/${metadata.tmdbId ?? ''}`,
        icon:  'spoilerzone',
      }
    default:
      return { title: 'Notification', body: 'Something happened.', link: '/', icon: 'bell' }
  }
}

// ── Core create ───────────────────────────────────────────────────────────────

async function shouldNotify(
  recipientId: string,
  prefKey: keyof NotificationPrefs,
): Promise<boolean> {
  const prefs = await prisma.notificationPreference.findUnique({
    where:  { userId: recipientId },
    select: { [prefKey]: true },
  })
  // If no prefs row yet, default is true (opted-in)
  if (!prefs) return true
  return (prefs as Record<string, boolean>)[prefKey] ?? true
}

async function createNotification(
  recipientId: string,
  actorId:     string | null,
  type:        NotificationType,
  metadata:    Record<string, unknown> = {},
): Promise<void> {
  if (actorId && recipientId === actorId) return  // never notify yourself

  try {
    await prisma.notification.create({
      data: {
        recipientId,
        // actorId is required by schema — use recipientId as self-actor for system notifications
        actorId: actorId ?? recipientId,
        type,
        metadata: metadata as object,
      },
    })
  } catch {
    // Swallow — notifications are non-critical
  }
}

// ── Typed notification helpers ────────────────────────────────────────────────

export async function notifyNewFollower(
  recipientId:  string,
  actorId:      string,
  actorUsername: string,
): Promise<void> {
  if (!await shouldNotify(recipientId, 'newFollowers')) return
  await createNotification(recipientId, actorId, 'new_follower', { username: actorUsername })
}

export async function notifyNewFriend(
  userAId: string,
  userBId: string,
  usernameA: string,
  usernameB: string,
): Promise<void> {
  // Both users get a notification
  await Promise.all([
    shouldNotify(userBId, 'newFriends').then(ok => ok
      ? createNotification(userBId, userAId, 'new_friend', { username: usernameA })
      : null),
    shouldNotify(userAId, 'newFriends').then(ok => ok
      ? createNotification(userAId, userBId, 'new_friend', { username: usernameB })
      : null),
  ])
}

export async function notifyCollectionUpvote(
  recipientId:    string,
  actorId:        string,
  collectionId:   string,
  collectionName: string,
): Promise<void> {
  if (!await shouldNotify(recipientId, 'collectionUpvotes')) return
  await createNotification(recipientId, actorId, 'collection_upvote', {
    collectionId,
    collectionName,
  })
}

export async function notifyReviewReply(
  recipientId:  string,
  actorId:      string,
  tmdbId:       number,
  movieTitle:   string,
): Promise<void> {
  if (!await shouldNotify(recipientId, 'reviewReplies')) return
  await createNotification(recipientId, actorId, 'review_reply', { tmdbId, movieTitle })
}

export async function notifyAchievement(
  recipientId:     string,
  achievementSlug: string,
  achievementName: string,
): Promise<void> {
  if (!await shouldNotify(recipientId, 'achievementUnlocks')) return
  // System notification — actor = recipient (self-triggered)
  await createNotification(recipientId, null, 'achievement', {
    achievementSlug,
    achievementName,
  })
}

export async function notifyDnaEvolved(
  recipientId: string,
  from:        string | null,
  to:          string,
): Promise<void> {
  if (!await shouldNotify(recipientId, 'dnaUpdates')) return
  await createNotification(recipientId, null, 'dna_evolved', { from, to })
}

export async function notifyRecsRefreshed(
  recipientId: string,
  count:       number,
): Promise<void> {
  if (!await shouldNotify(recipientId, 'recsRefreshed')) return
  await createNotification(recipientId, null, 'recs_refreshed', { count })
}

export async function notifyFriendActivity(
  recipientId:   string,
  actorId:       string,
  actorUsername: string,
  activityType:  string,
  extra:         Record<string, unknown> = {},
): Promise<void> {
  if (!await shouldNotify(recipientId, 'friendActivity')) return
  await createNotification(recipientId, actorId, 'friend_activity', {
    activityType,
    actorUsername,
    ...extra,
  })
}

// ── Legacy helper — kept for backwards compat ─────────────────────────────────
/** @deprecated Use the typed helpers above */
export async function createNotificationRaw(
  recipientId: string,
  actorId:     string,
  type:        NotificationType,
  metadata:    Record<string, unknown> = {},
): Promise<void> {
  return createNotification(recipientId, actorId, type, metadata)
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getNotifications(
  userId: string,
  limit  = 40,
): Promise<NotificationItem[]> {
  const rows = await prisma.notification.findMany({
    where:   { recipientId: userId },
    orderBy: { createdAt: 'desc' },
    take:    limit,
    include: {
      actor: { select: { id: true, username: true, avatarUrl: true } },
    },
  })

  return rows.map(r => {
    const meta   = r.metadata as Record<string, unknown>
    const actorUsername = r.actor.id === userId ? null : r.actor.username
    const resolved = resolveNotification(r.type as NotificationType, meta, actorUsername)
    return {
      id:             r.id,
      type:           r.type as NotificationType,
      actorId:        r.actor.id === userId ? null : r.actor.id,
      actorUsername,
      actorAvatarUrl: r.actor.id === userId ? null : r.actor.avatarUrl,
      title:          resolved.title,
      body:           resolved.body,
      link:           resolved.link,
      icon:           resolved.icon,
      metadata:       meta,
      read:           r.read,
      createdAt:      r.createdAt.toISOString(),
    }
  })
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { recipientId: userId, read: false } })
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { recipientId: userId, read: false },
    data:  { read: true },
  })
}

export async function markOneRead(notificationId: string, userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, recipientId: userId },
    data:  { read: true },
  })
}

// ── Notification preferences ──────────────────────────────────────────────────

export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const row = await prisma.notificationPreference.findUnique({ where: { userId } })
  return {
    newFollowers:       row?.newFollowers       ?? true,
    newFriends:         row?.newFriends         ?? true,
    friendActivity:     row?.friendActivity     ?? true,
    collectionUpvotes:  row?.collectionUpvotes  ?? true,
    reviewReplies:      row?.reviewReplies      ?? true,
    achievementUnlocks: row?.achievementUnlocks ?? true,
    dnaUpdates:         row?.dnaUpdates         ?? true,
    recsRefreshed:      row?.recsRefreshed      ?? true,
  }
}

export async function updateNotificationPrefs(
  userId: string,
  prefs:  Partial<NotificationPrefs>,
): Promise<NotificationPrefs> {
  const row = await prisma.notificationPreference.upsert({
    where:  { userId },
    create: { userId, ...prefs },
    update: prefs,
  })
  return {
    newFollowers:       row.newFollowers,
    newFriends:         row.newFriends,
    friendActivity:     row.friendActivity,
    collectionUpvotes:  row.collectionUpvotes,
    reviewReplies:      row.reviewReplies,
    achievementUnlocks: row.achievementUnlocks,
    dnaUpdates:         row.dnaUpdates,
    recsRefreshed:      row.recsRefreshed,
  }
}
