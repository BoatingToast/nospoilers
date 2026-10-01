'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ReviewWithMeta } from '@/services/reviews'
import type { ReplyWithUser } from '@/services/reviews'
import { WarningIcon } from '@/components/icons'
import { passportLevelLabel } from '@/lib/plot-passport'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

interface Props {
  review:      ReviewWithMeta
  isOwn:       boolean
  onEdit?:     () => void
  onDeleted?:  (id: string) => void
  sessionId?:  string
  sessionAvatarUrl?: string | null
  sessionUsername?: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function RatingBadge({ rating }: { rating: number }) {
  const color = rating >= 80 ? 'text-emerald-400' : rating >= 60 ? 'text-ns-secondary-readable' : 'text-rose-400'
  return (
    <span className={`font-heading font-semibold text-sm ${color}`}>{rating}/100</span>
  )
}

// ─── Reply thread ─────────────────────────────────────────────────────────────

function ReplyThread({
  reviewId,
  replyCount,
  sessionId,
  sessionAvatarUrl,
  sessionUsername,
  explicitlyRevealed,
}: {
  reviewId:   string
  replyCount: number
  sessionId?: string
  sessionAvatarUrl?: string | null
  sessionUsername?: string
  explicitlyRevealed?: boolean
}) {
  const [open,    setOpen]    = useState(false)
  const [replies, setReplies] = useState<ReplyWithUser[]>([])
  const [loading, setLoading] = useState(false)
  const [draft,   setDraft]   = useState('')
  const [posting, setPosting] = useState(false)

  async function load() {
    if (open) { setOpen(false); return }
    setLoading(true)
    const suffix = explicitlyRevealed ? '?reveal=1' : ''
    const res = await fetch(`/api/reviews/${reviewId}/replies${suffix}`, { cache: 'no-store' })
    const data = await res.json()
    setReplies(data.replies ?? [])
    setLoading(false)
    setOpen(true)
  }

  async function postReply() {
    if (!draft.trim() || posting) return
    setPosting(true)
    const res = await fetch(`/api/reviews/${reviewId}/replies`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ body: draft.trim() }),
    })
    if (res.ok) {
      const reply = await res.json()
      setReplies(prev => [...prev, reply])
      setDraft('')
    }
    setPosting(false)
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={load}
        className="flex min-h-10 items-center gap-1.5 text-xs font-body text-ns-muted transition-colors hover:text-ns-text"
      >
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {replyCount > 0 ? `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}` : 'Reply'}
      </button>

      {loading && (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="animate-pulse h-8 bg-ns-border rounded" />
          ))}
        </div>
      )}

      {open && !loading && (
        <div className="mt-3 pl-4 border-l border-ns-border space-y-3">
          {replies.map(reply => (
            <div key={reply.id} className="flex gap-2.5">
              <Avatar src={reply.avatarUrl} username={reply.username} size="xs" href />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <Link href={`/profile/${reply.username}`}
                    className="text-xs font-heading font-medium text-white hover:text-ns-secondary-readable transition-colors">
                    @{reply.username}
                  </Link>
                  <span className="text-[11px] font-body text-ns-muted">{formatDate(reply.createdAt)}</span>
                </div>
                <p className="text-sm font-body text-ns-text/85 leading-relaxed mt-0.5">{reply.body}</p>
              </div>
            </div>
          ))}

          {/* Reply input */}
          {sessionId && (
            <div className="flex gap-2 items-start pt-1">
              <Avatar src={sessionAvatarUrl} username={sessionUsername} size="xs" />
              <div className="flex-1 flex gap-2">
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postReply()}
                  placeholder="Write a reply..."
                  className="min-h-10 min-w-0 flex-1 bg-ns-bg border border-ns-border rounded px-3 py-1.5 text-sm font-body
                             text-ns-text placeholder-ns-muted/40 focus:outline-none focus:border-ns-secondary/50 transition-colors"
                />
                <button
                  onClick={postReply}
                  disabled={posting || !draft.trim()}
                  type="button"
                  className="min-h-10 px-3 py-1.5 rounded border border-ns-border text-ns-text text-xs font-heading font-medium
                             hover:border-ns-text disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  {posting ? '…' : 'Post'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main card ────────────────────────────────────────────────────────────────

export default function ReviewCard({
  review,
  isOwn,
  onEdit,
  onDeleted,
  sessionId,
  sessionAvatarUrl,
  sessionUsername,
}: Props) {
  const [revealedReview, setRevealedReview] = useState<{ title: string | null; body: string } | null>(null)
  const [revealLoading, setRevealLoading] = useState(false)
  const [revealError, setRevealError] = useState(false)
  const [votes,           setVotes]           = useState({
    upvotes:     review.upvotes,
    downvotes:   review.downvotes,
    helpfulCount: review.helpfulCount,
  })
  const [viewerVotes, setViewerVotes] = useState<string[]>(review.viewerVotes)
  const [deleting,    setDeleting]    = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const passportLocked = !isOwn && !review.viewerUnlocked && revealedReview === null
  const visibleTitle = review.viewerUnlocked || isOwn ? review.title : revealedReview?.title ?? null
  const visibleBody = review.viewerUnlocked || isOwn ? review.body : revealedReview?.body ?? ''

  async function revealSpoiler() {
    if (revealLoading) return
    setRevealLoading(true)
    setRevealError(false)
    try {
      const response = await fetch(`/api/reviews/${review.id}/reveal`, {
        method: 'POST',
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Reveal failed')
      const data = await response.json() as { title?: unknown; body?: unknown }
      if (typeof data.body !== 'string') throw new Error('Invalid reveal response')
      setRevealedReview({
        title: typeof data.title === 'string' ? data.title : null,
        body: data.body,
      })
    } catch {
      setRevealError(true)
    } finally {
      setRevealLoading(false)
    }
  }

  async function vote(type: 'upvote' | 'downvote' | 'helpful') {
    if (!sessionId) return
    const res  = await fetch(`/api/reviews/${review.id}/vote`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type }),
    })
    const data = await res.json()
    if (data.action === 'added') {
      setViewerVotes(prev => [...prev.filter(v => {
        if (type === 'upvote'   && v === 'downvote') return false
        if (type === 'downvote' && v === 'upvote')   return false
        return true
      }), type])
    } else {
      setViewerVotes(prev => prev.filter(v => v !== type))
    }
    // Optimistic count update
    setVotes(prev => {
      const next = { ...prev }
      if (data.action === 'added') {
        if (type === 'upvote')   { next.upvotes++;     if (viewerVotes.includes('downvote')) next.downvotes-- }
        if (type === 'downvote') { next.downvotes++;   if (viewerVotes.includes('upvote'))   next.upvotes-- }
        if (type === 'helpful')  { next.helpfulCount++ }
      } else {
        if (type === 'upvote')   next.upvotes     = Math.max(0, next.upvotes - 1)
        if (type === 'downvote') next.downvotes   = Math.max(0, next.downvotes - 1)
        if (type === 'helpful')  next.helpfulCount = Math.max(0, next.helpfulCount - 1)
      }
      return next
    })
  }

  async function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); return }
    setDeleting(true)
    await fetch(`/api/reviews/${review.id}`, { method: 'DELETE' })
    onDeleted?.(review.id)
  }

  const bodyContent = (
    <div className="prose prose-sm prose-invert max-w-none">
      {visibleBody.split('\n').map((line, i) => (
        <p key={i} className="text-sm font-body text-ns-text/85 leading-relaxed mb-2 last:mb-0">
          {line}
        </p>
      ))}
    </div>
  )

  return (
    <article className="min-w-0 border-t border-ns-border py-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <Avatar src={review.avatarUrl} username={review.username} size="sm" href />

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/profile/${review.username}`}
                className="font-heading font-semibold text-sm text-white hover:text-ns-secondary-readable transition-colors">
                @{review.username}
              </Link>
              {review.isFriend && (
                <Badge variant="secondary">Friend</Badge>
              )}
              {isOwn && (
                <Badge variant="muted">You</Badge>
              )}
            </div>
            <p className="text-ns-muted text-[11px] font-body">{formatDate(review.createdAt)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {review.rating !== null && <RatingBadge rating={review.rating} />}

          {/* Spoiler badge */}
          {review.spoilerLevel !== 'safe' && (
            <Badge variant="warning">
              <WarningIcon size={10} />{passportLevelLabel(review.spoilerLevel)}
            </Badge>
          )}

          {/* Own review actions */}
          {isOwn && (
            <div className="flex items-center gap-1">
              <button type="button" onClick={onEdit}
                className="min-h-10 text-ns-muted hover:text-ns-text text-xs font-body underline-offset-4 hover:underline transition-colors px-2 py-1 rounded">
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className={`min-h-10 text-xs font-body px-2 py-1 rounded transition-colors ${
                  confirmDel
                    ? 'text-rose-400 hover:text-rose-300 bg-rose-500/10'
                    : 'text-ns-muted hover:text-rose-400 hover:bg-white/5'
                }`}
              >
                {deleting ? '…' : confirmDel ? 'Confirm?' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Headline */}
      {visibleTitle && (
        <p className="font-heading font-semibold text-white mb-2">{visibleTitle}</p>
      )}

      {/* Body — spoiler gate */}
      {passportLocked ? (
        <div className="mb-3 border-l-2 border-amber-500/40 pl-4">
          <p className="text-amber-400 text-sm font-heading font-medium flex items-center gap-1.5">
            <WarningIcon size={14} />Locked by your Plot Passport
          </p>
          <p className="mt-1 max-w-md text-ns-muted text-xs font-body">
            You are at {review.viewerProgress}%. This review unlocks automatically at {review.unlockAtProgress}%.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sessionId && (
              <Button variant="secondary" size="sm" href="/plot-passport" className="min-h-10">
                Update progress
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={revealSpoiler} disabled={revealLoading} className="min-h-10">
              {revealLoading ? 'Revealing…' : 'Reveal anyway'}
            </Button>
          </div>
          {revealError && (
            <p className="mt-2 text-rose-400 text-xs font-body">Could not reveal this review. Try again.</p>
          )}
        </div>
      ) : (
        <div className="mb-3">{bodyContent}</div>
      )}

      {/* Interaction bar */}
      <div className="flex flex-wrap items-center gap-1">

        {/* Helpful */}
        <button
          type="button"
          onClick={() => vote('helpful')}
          disabled={!sessionId}
          className={`flex min-h-10 items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-body transition-colors ${
            viewerVotes.includes('helpful')
              ? 'bg-ns-secondary/15 text-ns-secondary-readable'
              : 'text-ns-muted hover:text-white hover:bg-white/5'
          } disabled:opacity-50 disabled:cursor-default`}
        >
          <svg width="12" height="12" fill={viewerVotes.includes('helpful') ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          Helpful {votes.helpfulCount > 0 && <span className="font-medium">{votes.helpfulCount}</span>}
        </button>

        {/* Upvote */}
        <button
          type="button"
          onClick={() => vote('upvote')}
          disabled={!sessionId}
          className={`flex min-h-10 items-center gap-1 px-2.5 py-1.5 rounded text-xs font-body transition-colors ${
            viewerVotes.includes('upvote')
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'text-ns-muted hover:text-white hover:bg-white/5'
          } disabled:opacity-50 disabled:cursor-default`}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          {votes.upvotes > 0 && votes.upvotes}
        </button>

        {/* Downvote */}
        <button
          type="button"
          onClick={() => vote('downvote')}
          disabled={!sessionId}
          className={`flex min-h-10 items-center gap-1 px-2.5 py-1.5 rounded text-xs font-body transition-colors ${
            viewerVotes.includes('downvote')
              ? 'bg-rose-500/15 text-rose-400'
              : 'text-ns-muted hover:text-white hover:bg-white/5'
          } disabled:opacity-50 disabled:cursor-default`}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          {votes.downvotes > 0 && votes.downvotes}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Reply toggle (handled by ReplyThread below) */}
      </div>

      {/* Reply thread */}
      {!passportLocked && (
        <ReplyThread
          reviewId={review.id}
          replyCount={review.replyCount}
          sessionId={sessionId}
          sessionAvatarUrl={sessionAvatarUrl}
          sessionUsername={sessionUsername}
          explicitlyRevealed={revealedReview !== null}
        />
      )}
    </article>
  )
}
