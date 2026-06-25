'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ReviewWithMeta } from '@/services/reviews'
import type { ReplyWithUser } from '@/services/reviews'
import { WarningIcon } from '@/components/icons'

interface Props {
  review:      ReviewWithMeta
  isOwn:       boolean
  onEdit?:     () => void
  onDeleted?:  (id: string) => void
  sessionId?:  string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function RatingBadge({ rating }: { rating: number }) {
  const color = rating >= 80 ? 'text-emerald-400' : rating >= 60 ? 'text-ns-gold' : 'text-rose-400'
  return (
    <span className={`font-heading font-semibold text-sm ${color}`}>{rating}/100</span>
  )
}

// ─── Reply thread ─────────────────────────────────────────────────────────────

function ReplyThread({
  reviewId,
  replyCount,
  sessionId,
}: {
  reviewId:   string
  replyCount: number
  sessionId?: string
}) {
  const [open,    setOpen]    = useState(false)
  const [replies, setReplies] = useState<ReplyWithUser[]>([])
  const [loading, setLoading] = useState(false)
  const [draft,   setDraft]   = useState('')
  const [posting, setPosting] = useState(false)

  async function load() {
    if (open) { setOpen(false); return }
    setLoading(true)
    const res = await fetch(`/api/reviews/${reviewId}/replies`)
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
        onClick={load}
        className="text-xs font-body text-ns-muted hover:text-white transition-colors flex items-center gap-1.5"
      >
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {replyCount > 0 ? `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}` : 'Reply'}
      </button>

      {loading && (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="animate-pulse h-8 bg-ns-border rounded-lg" />
          ))}
        </div>
      )}

      {open && !loading && (
        <div className="mt-3 pl-4 border-l border-ns-border space-y-3">
          {replies.map(reply => (
            <div key={reply.id} className="flex gap-2.5">
              <Link href={`/profile/${reply.username}`}
                className="w-6 h-6 rounded-full bg-ns-gold/20 border border-ns-gold/30 flex-shrink-0
                           flex items-center justify-center text-ns-gold text-[10px] font-bold hover:bg-ns-gold/30 transition-colors">
                {reply.username[0]?.toUpperCase()}
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <Link href={`/profile/${reply.username}`}
                    className="text-xs font-heading font-medium text-white hover:text-ns-gold transition-colors">
                    @{reply.username}
                  </Link>
                  <span className="text-[10px] font-body text-ns-muted">{formatDate(reply.createdAt)}</span>
                </div>
                <p className="text-sm font-body text-ns-text/85 leading-relaxed mt-0.5">{reply.body}</p>
              </div>
            </div>
          ))}

          {/* Reply input */}
          {sessionId && (
            <div className="flex gap-2 items-start pt-1">
              <div className="w-6 h-6 rounded-full bg-ns-gold/20 border border-ns-gold/30 flex-shrink-0
                              flex items-center justify-center text-ns-gold text-[10px] font-bold">
                {/* own initial */}
                ✎
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postReply()}
                  placeholder="Write a reply..."
                  className="flex-1 bg-ns-bg border border-ns-border rounded-lg px-3 py-1.5 text-sm font-body
                             text-ns-text placeholder-ns-muted/40 focus:outline-none focus:border-ns-gold/50 transition-colors"
                />
                <button
                  onClick={postReply}
                  disabled={posting || !draft.trim()}
                  className="px-3 py-1.5 rounded-lg bg-ns-gold/15 text-ns-gold text-xs font-heading font-medium
                             hover:bg-ns-gold/25 disabled:opacity-40 transition-colors whitespace-nowrap"
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

export default function ReviewCard({ review, isOwn, onEdit, onDeleted, sessionId }: Props) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false)
  const [votes,           setVotes]           = useState({
    upvotes:     review.upvotes,
    downvotes:   review.downvotes,
    helpfulCount: review.helpfulCount,
  })
  const [viewerVotes, setViewerVotes] = useState<string[]>(review.viewerVotes)
  const [deleting,    setDeleting]    = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)

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
      {review.body.split('\n').map((line, i) => (
        <p key={i} className="text-sm font-body text-ns-text/85 leading-relaxed mb-2 last:mb-0">
          {line}
        </p>
      ))}
    </div>
  )

  return (
    <article className={`rounded-2xl border p-5 transition-all duration-200 ${
      review.isFriend
        ? 'bg-ns-gold/4 border-ns-gold/20'
        : 'bg-ns-surface border-ns-border'
    }`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <Link href={`/profile/${review.username}`}
            className="w-9 h-9 rounded-full bg-ns-gold/20 border border-ns-gold/30 flex-shrink-0
                       flex items-center justify-center text-ns-gold text-sm font-bold
                       hover:bg-ns-gold/30 transition-colors">
            {review.username[0]?.toUpperCase()}
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/profile/${review.username}`}
                className="font-heading font-semibold text-sm text-white hover:text-ns-gold transition-colors">
                @{review.username}
              </Link>
              {review.isFriend && (
                <span className="px-2 py-0.5 rounded-full bg-ns-gold/15 text-ns-gold text-[10px] font-body">
                  Friend
                </span>
              )}
              {isOwn && (
                <span className="px-2 py-0.5 rounded-full bg-white/8 text-ns-muted text-[10px] font-body">
                  You
                </span>
              )}
            </div>
            <p className="text-ns-muted text-[11px] font-body">{formatDate(review.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {review.rating !== null && <RatingBadge rating={review.rating} />}

          {/* Spoiler badge */}
          {review.hasSpoilers && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-body whitespace-nowrap">
              <WarningIcon size={10} className="inline-block mr-1" />Spoilers
            </span>
          )}

          {/* Own review actions */}
          {isOwn && (
            <div className="flex items-center gap-1">
              <button onClick={onEdit}
                className="text-ns-muted hover:text-white text-xs font-body transition-colors px-2 py-1 rounded hover:bg-white/5">
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`text-xs font-body px-2 py-1 rounded transition-colors ${
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
      {review.title && (
        <p className="font-heading font-semibold text-white mb-2">{review.title}</p>
      )}

      {/* Body — spoiler gate */}
      {review.hasSpoilers && !spoilerRevealed ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-3">
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-amber-400 text-sm font-heading font-medium flex items-center gap-1.5">
              <WarningIcon size={14} />Contains Spoilers
            </p>
            <p className="text-ns-muted text-xs font-body text-center max-w-xs">
              This review reveals plot details. Only read if you've already seen the film.
            </p>
            <button
              onClick={() => setSpoilerRevealed(true)}
              className="px-4 py-2 rounded-xl border border-amber-500/40 text-amber-400 text-sm font-heading font-medium
                         hover:bg-amber-500/15 transition-colors"
            >
              Show Review
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-3">{bodyContent}</div>
      )}

      {/* Interaction bar */}
      <div className="flex items-center gap-1 pt-3 border-t border-ns-border/60">

        {/* Helpful */}
        <button
          onClick={() => vote('helpful')}
          disabled={!sessionId}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-body transition-colors ${
            viewerVotes.includes('helpful')
              ? 'bg-ns-gold/15 text-ns-gold'
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
          onClick={() => vote('upvote')}
          disabled={!sessionId}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-body transition-colors ${
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
          onClick={() => vote('downvote')}
          disabled={!sessionId}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-body transition-colors ${
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
      <ReplyThread
        reviewId={review.id}
        replyCount={review.replyCount}
        sessionId={sessionId}
      />
    </article>
  )
}
