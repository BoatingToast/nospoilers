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
import Input from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import GrowBar from '@/components/movie/GrowBar'
import WipeText from '@/components/movie/WipeText'

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
  return (
    <span className="flex-shrink-0 font-heading text-lg font-bold tabular-nums text-ns-text">
      {rating}<span className="text-sm font-medium text-ns-muted">/100</span>
    </span>
  )
}

const VOTE_BASE = 'inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors duration-150 disabled:cursor-default disabled:text-ns-subtle disabled:hover:bg-transparent'
const VOTE_IDLE = 'text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text'

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
    <div className="mt-1">
      <button
        type="button"
        onClick={load}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ns-muted transition-colors duration-150 hover:bg-ns-surface-2 hover:text-ns-text"
      >
        <svg aria-hidden="true" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {replyCount > 0 ? `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}` : 'Reply'}
      </button>

      {loading && (
        <div className="mt-3 space-y-2" aria-hidden="true">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-10 !bg-ns-surface-2" />
          ))}
        </div>
      )}

      {open && !loading && (
        <div className="mt-3 animate-fade-up space-y-4 border-l-2 border-ns-border pl-4">
          {replies.map(reply => (
            <div key={reply.id} className="flex gap-2.5">
              <Avatar src={reply.avatarUrl} username={reply.username} size="xs" href />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <Link href={`/profile/${reply.username}`}
                    className="break-all font-heading text-sm font-semibold text-ns-text transition-colors hover:text-ns-secondary-readable">
                    @{reply.username}
                  </Link>
                  <span className="text-xs text-ns-muted">{formatDate(reply.createdAt)}</span>
                </div>
                <p className="mt-0.5 break-words text-base leading-relaxed text-ns-text">{reply.body}</p>
              </div>
            </div>
          ))}

          {/* Reply input */}
          {sessionId && (
            <div className="flex items-center gap-2 pt-1">
              <Avatar src={sessionAvatarUrl} username={sessionUsername} size="xs" />
              <div className="min-w-0 flex-1">
                <Input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) void postReply() }}
                  placeholder="Write a reply..."
                  aria-label="Write a reply"
                />
              </div>
              <Button variant="secondary" size="sm" onClick={postReply} disabled={posting || !draft.trim()} className="!bg-ns-surface-2 hover:!bg-ns-surface-3">
                {posting ? '…' : 'Post'}
              </Button>
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

  // Text the viewer just chose to reveal wipes open. Text that was already
  // readable when the card loaded is not animated.
  const justRevealed = revealedReview !== null && !review.viewerUnlocked && !isOwn

  const bodyContent = (
    <div className="max-w-none break-words">
      {visibleBody.split('\n').map((line, i) => (
        <p key={i} className="mb-2 text-base leading-relaxed text-ns-text last:mb-0">
          {justRevealed ? <WipeText animate>{line}</WipeText> : line}
        </p>
      ))}
    </div>
  )

  return (
    <article className="rounded-2xl bg-ns-surface p-5 sm:p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar src={review.avatarUrl} username={review.username} size="sm" href />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link href={`/profile/${review.username}`}
                className="break-all font-heading text-base font-semibold text-ns-text transition-colors hover:text-ns-secondary-readable">
                @{review.username}
              </Link>
              {review.isFriend && <Badge variant="secondary">Friend</Badge>}
              {isOwn && <Badge>You</Badge>}
              {review.spoilerLevel !== 'safe' && (
                <Badge variant="warning">
                  <WarningIcon size={12} />{passportLevelLabel(review.spoilerLevel)}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-ns-muted">{formatDate(review.createdAt)}</p>
          </div>
        </div>

        {review.rating !== null && <RatingBadge rating={review.rating} />}
      </div>

      {/* Headline */}
      {visibleTitle && (
        <p className="mb-2 break-words font-heading text-lg font-bold text-ns-text">
          {justRevealed ? <WipeText animate>{visibleTitle}</WipeText> : visibleTitle}
        </p>
      )}

      {/* Body — spoiler gate */}
      {passportLocked ? (
        <div className="mb-3 rounded-xl bg-ns-surface-2 p-4 sm:p-5">
          {/* Fixed-size bars: nothing here is derived from the hidden review. */}
          <div aria-hidden="true" className="mb-4 space-y-2">
            <span className="block h-4 w-full rounded bg-ns-secondary" />
            <span className="block h-4 w-2/3 rounded bg-ns-secondary" />
          </div>
          <p className="flex items-center gap-2 font-heading text-base font-semibold text-ns-text">
            <WarningIcon size={16} className="flex-shrink-0 text-ns-warning" />Locked by your Plot Passport
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ns-muted">
            You are at {review.viewerProgress}%. This review unlocks automatically at {review.unlockAtProgress}%.
          </p>
          <div className="relative mt-3">
            <GrowBar value={review.viewerProgress / 100} fillClassName="bg-ns-text" />
            <span
              aria-hidden="true"
              className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-full bg-ns-warning"
              style={{ left: `${Math.min(100, Math.max(0, review.unlockAtProgress))}%` }}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {sessionId && (
              <Button href="/plot-passport" variant="secondary" size="sm" className="!bg-ns-surface-3 hover:!bg-ns-border">
                Update progress
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={revealSpoiler} loading={revealLoading} className="hover:!bg-ns-surface-3">
              {revealLoading ? 'Revealing…' : 'Reveal anyway'}
            </Button>
          </div>
          {revealError && (
            <p role="alert" className="mt-2 text-sm text-ns-danger">Could not reveal this review. Try again.</p>
          )}
        </div>
      ) : (
        <div className="mb-3">{bodyContent}</div>
      )}

      {/* Interaction bar */}
      <div className="-mx-2 flex flex-wrap items-center gap-1 border-t border-ns-border pt-2">
        <button
          type="button"
          onClick={() => vote('helpful')}
          disabled={!sessionId}
          aria-pressed={viewerVotes.includes('helpful')}
          className={`${VOTE_BASE} ${viewerVotes.includes('helpful') ? 'bg-ns-surface-3 text-ns-text' : VOTE_IDLE}`}
        >
          <svg aria-hidden="true" width="15" height="15" fill={viewerVotes.includes('helpful') ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          Helpful {votes.helpfulCount > 0 && <span key={votes.helpfulCount} className="inline-block animate-fade-up font-semibold tabular-nums">{votes.helpfulCount}</span>}
        </button>

        <button
          type="button"
          onClick={() => vote('upvote')}
          disabled={!sessionId}
          aria-pressed={viewerVotes.includes('upvote')}
          aria-label={`Upvote, ${votes.upvotes}`}
          className={`${VOTE_BASE} min-w-11 justify-center ${viewerVotes.includes('upvote') ? 'bg-ns-success/10 text-ns-success' : VOTE_IDLE}`}
        >
          <svg aria-hidden="true" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          {votes.upvotes > 0 && <span key={votes.upvotes} className="inline-block animate-fade-up tabular-nums">{votes.upvotes}</span>}
        </button>

        <button
          type="button"
          onClick={() => vote('downvote')}
          disabled={!sessionId}
          aria-pressed={viewerVotes.includes('downvote')}
          aria-label={`Downvote, ${votes.downvotes}`}
          className={`${VOTE_BASE} min-w-11 justify-center ${viewerVotes.includes('downvote') ? 'bg-ns-danger/10 text-ns-danger' : VOTE_IDLE}`}
        >
          <svg aria-hidden="true" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          {votes.downvotes > 0 && <span key={votes.downvotes} className="inline-block animate-fade-up tabular-nums">{votes.downvotes}</span>}
        </button>

        {isOwn && (
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={onEdit} className={`${VOTE_BASE} ${VOTE_IDLE}`}>
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className={`${VOTE_BASE} ${confirmDel ? 'bg-ns-danger/10 text-ns-danger' : 'text-ns-muted hover:bg-ns-surface-2 hover:text-ns-danger'}`}
            >
              {deleting ? '…' : confirmDel ? 'Confirm?' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {/* Reply thread */}
      {!passportLocked && (
        <div className="-mx-2">
          <ReplyThread
            reviewId={review.id}
            replyCount={review.replyCount}
            sessionId={sessionId}
            sessionAvatarUrl={sessionAvatarUrl}
            sessionUsername={sessionUsername}
            explicitlyRevealed={revealedReview !== null}
          />
        </div>
      )}
    </article>
  )
}
