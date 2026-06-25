/**
 * Friends Service
 * ───────────────
 * Manages FriendRequest and Friendship records.
 *
 * Key invariants:
 *   • A Friendship row always stores userAId < userBId lexicographically to avoid duplicates.
 *   • Accepting a request creates a Friendship and marks the request "accepted".
 *   • Removing a friend deletes the Friendship (request record stays for history).
 */

import { prisma } from '@/lib/db'
import { logActivity } from './activity'
import type { FriendStatus } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Canonical ordering so (A,B) and (B,A) always map to the same row */
function orderedPair(aId: string, bId: string): [string, string] {
  return aId < bId ? [aId, bId] : [bId, aId]
}

// ─── Friend status ─────────────────────────────────────────────────────────────

/**
 * Returns the relationship status between two users from the perspective of `viewerId`.
 *   'none'     — no relationship
 *   'pending_sent'     — viewer sent a request, waiting
 *   'pending_received' — viewer received a request, can accept/reject
 *   'friends'          — mutual friendship exists
 */
export async function getFriendStatus(
  viewerId: string,
  targetId: string,
): Promise<FriendStatus> {
  if (viewerId === targetId) return 'none'

  const [userAId, userBId] = orderedPair(viewerId, targetId)

  const [friendship, sentReq, receivedReq] = await Promise.all([
    prisma.friendship.findUnique({ where: { userAId_userBId: { userAId, userBId } } }),
    prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: viewerId, receiverId: targetId } },
    }),
    prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: targetId, receiverId: viewerId } },
    }),
  ])

  if (friendship) return 'friends'
  if (sentReq?.status === 'pending') return 'pending_sent'
  if (receivedReq?.status === 'pending') return 'pending_received'
  return 'none'
}

// ─── Send a friend request ────────────────────────────────────────────────────

export async function sendFriendRequest(
  senderId: string,
  receiverId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (senderId === receiverId) return { ok: false, error: 'Cannot friend yourself' }

  // Check not already friends
  const [userAId, userBId] = orderedPair(senderId, receiverId)
  const existing = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  })
  if (existing) return { ok: false, error: 'Already friends' }

  // Check for existing request either direction
  const alreadySent = await prisma.friendRequest.findUnique({
    where: { senderId_receiverId: { senderId, receiverId } },
  })
  if (alreadySent) {
    if (alreadySent.status === 'pending') return { ok: false, error: 'Request already sent' }
    // Was rejected — allow re-sending by updating
    await prisma.friendRequest.update({
      where: { id: alreadySent.id },
      data:  { status: 'pending', updatedAt: new Date() },
    })
    return { ok: true }
  }

  // Check if they already sent us a request — auto-accept
  const theirRequest = await prisma.friendRequest.findUnique({
    where: { senderId_receiverId: { senderId: receiverId, receiverId: senderId } },
  })
  if (theirRequest?.status === 'pending') {
    return acceptFriendRequest(theirRequest.id, senderId)
  }

  await prisma.friendRequest.create({ data: { senderId, receiverId } })

  const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { username: true } })
  await logActivity(senderId, 'sent_friend_request', { targetUsername: receiver?.username ?? '' })

  return { ok: true }
}

// ─── Accept a friend request ──────────────────────────────────────────────────

export async function acceptFriendRequest(
  requestId: string,
  acceptorId: string,
): Promise<{ ok: boolean; error?: string }> {
  const request = await prisma.friendRequest.findUnique({ where: { id: requestId } })
  if (!request) return { ok: false, error: 'Request not found' }
  if (request.receiverId !== acceptorId) return { ok: false, error: 'Not your request' }
  if (request.status !== 'pending') return { ok: false, error: 'Request already handled' }

  const [userAId, userBId] = orderedPair(request.senderId, request.receiverId)

  await prisma.$transaction([
    prisma.friendRequest.update({
      where: { id: requestId },
      data:  { status: 'accepted', updatedAt: new Date() },
    }),
    prisma.friendship.upsert({
      where:  { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId },
      update: {},
    }),
  ])

  const sender = await prisma.user.findUnique({ where: { id: request.senderId }, select: { username: true } })
  await logActivity(acceptorId, 'accepted_friend_request', { targetUsername: sender?.username ?? '' })

  return { ok: true }
}

// ─── Reject a friend request ──────────────────────────────────────────────────

export async function rejectFriendRequest(
  requestId: string,
  rejectorId: string,
): Promise<{ ok: boolean; error?: string }> {
  const request = await prisma.friendRequest.findUnique({ where: { id: requestId } })
  if (!request) return { ok: false, error: 'Request not found' }
  if (request.receiverId !== rejectorId) return { ok: false, error: 'Not your request' }

  await prisma.friendRequest.update({
    where: { id: requestId },
    data:  { status: 'rejected', updatedAt: new Date() },
  })

  return { ok: true }
}

// ─── Remove a friend ──────────────────────────────────────────────────────────

export async function removeFriend(
  userId: string,
  friendId: string,
): Promise<{ ok: boolean }> {
  const [userAId, userBId] = orderedPair(userId, friendId)
  await prisma.friendship.deleteMany({
    where: { userAId, userBId },
  }).catch(() => {})
  return { ok: true }
}

// ─── List friends ─────────────────────────────────────────────────────────────

export interface FriendSummary {
  id:          string
  username:    string
  avatarUrl:   string | null
  createdAt:   string // friendship createdAt
  personality: string | null
}

export async function getFriends(userId: string): Promise<FriendSummary[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    include: {
      userA: { select: { id: true, username: true, avatarUrl: true, personality: { select: { primaryType: true } } } },
      userB: { select: { id: true, username: true, avatarUrl: true, personality: { select: { primaryType: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return friendships.map(f => {
    const friend = f.userAId === userId ? f.userB : f.userA
    return {
      id:          friend.id,
      username:    friend.username,
      avatarUrl:   friend.avatarUrl ?? null,
      createdAt:   f.createdAt.toISOString(),
      personality: friend.personality?.primaryType ?? null,
    }
  })
}

// ─── List pending requests ────────────────────────────────────────────────────

export interface PendingRequest {
  id:       string
  username: string
  sentAt:   string
  requestId: string
}

export async function getPendingRequests(userId: string): Promise<{
  received: PendingRequest[]
  sent:     PendingRequest[]
}> {
  const [received, sent] = await Promise.all([
    prisma.friendRequest.findMany({
      where:   { receiverId: userId, status: 'pending' },
      include: { sender: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendRequest.findMany({
      where:   { senderId: userId, status: 'pending' },
      include: { receiver: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return {
    received: received.map(r => ({
      id:        r.sender.id,
      username:  r.sender.username,
      sentAt:    r.createdAt.toISOString(),
      requestId: r.id,
    })),
    sent: sent.map(r => ({
      id:        r.receiver.id,
      username:  r.receiver.username,
      sentAt:    r.createdAt.toISOString(),
      requestId: r.id,
    })),
  }
}

// ─── Check if two users are friends ──────────────────────────────────────────

export async function areFriends(userAId: string, userBId: string): Promise<boolean> {
  const [a, b] = orderedPair(userAId, userBId)
  const f = await prisma.friendship.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } })
  return !!f
}

// ─── Get friend IDs for a user ────────────────────────────────────────────────

export async function getFriendIds(userId: string): Promise<string[]> {
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true },
  })
  return friendships.map(f => f.userAId === userId ? f.userBId : f.userAId)
}
