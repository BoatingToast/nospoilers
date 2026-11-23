'use client'

import { useState, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import type { VoteType, VoteResult } from '@/types'

interface Props {
  collectionId: string
  ownerId:      string
  initialVotes: { upvotes: number; downvotes: number; score: number }
  initialVote:  VoteType | null
  compact?:     boolean   // small inline version for cards
}

export default function VoteButtons({
  collectionId,
  ownerId,
  initialVotes,
  initialVote,
  compact = false,
}: Props) {
  const { data: session, status } = useSession()
  const [votes,    setVotes]    = useState(initialVotes)
  const [userVote, setUserVote] = useState<VoteType | null>(initialVote)
  const [pending,  startTransition] = useTransition()

  const isOwner = session?.user?.id === ownerId
  const isAuthed = status === 'authenticated'

  async function handleVote(type: VoteType) {
    if (!isAuthed || isOwner) return

    const isToggleOff = userVote === type

    // Optimistic update
    const prev  = { ...votes }
    const prevVote = userVote

    setUserVote(isToggleOff ? null : type)
    setVotes(v => {
      const next = { ...v }
      // Remove previous vote effect
      if (prevVote === 'upvote')   next.upvotes--
      if (prevVote === 'downvote') next.downvotes--
      // Apply new vote
      if (!isToggleOff) {
        if (type === 'upvote')   next.upvotes++
        if (type === 'downvote') next.downvotes++
      }
      next.score = next.upvotes - next.downvotes
      return next
    })

    startTransition(async () => {
      try {
        let res: Response
        if (isToggleOff) {
          res = await fetch(`/api/collections/${collectionId}/vote`, { method: 'DELETE' })
        } else {
          res = await fetch(`/api/collections/${collectionId}/vote`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ voteType: type }),
          })
        }
        if (res.ok) {
          const data: VoteResult = await res.json()
          setVotes({ upvotes: data.upvotes, downvotes: data.downvotes, score: data.score })
          setUserVote(data.userVote)
        } else {
          // Revert
          setVotes(prev)
          setUserVote(prevVote)
        }
      } catch {
        setVotes(prev)
        setUserVote(prevVote)
      }
    })
  }

  const disabled = !isAuthed || isOwner || pending
  const hint = isOwner
    ? 'Cannot vote on your own collection'
    : status === 'unauthenticated'
      ? 'Sign in to vote'
      : undefined

  const voteButton = (type: VoteType) => {
    const up = type === 'upvote'
    const active = userVote === type
    const count = up ? votes.upvotes : votes.downvotes
    return (
      <button
        type="button"
        onClick={() => handleVote(type)}
        disabled={disabled}
        title={hint ?? (up ? 'Upvote' : 'Downvote')}
        aria-label={`${up ? 'Upvote' : 'Downvote'}, ${count}`}
        aria-pressed={active}
        className={cn(
          'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold tabular-nums transition-colors duration-150 disabled:cursor-not-allowed',
          compact ? 'min-w-11 flex-1 px-2.5' : 'min-w-[4.5rem] px-4',
          active
            ? up ? 'bg-ns-success/15 text-ns-success' : 'bg-ns-danger/15 text-ns-danger'
            : cn(
                'text-ns-muted enabled:hover:bg-ns-surface-2',
                up ? 'enabled:hover:text-ns-success' : 'enabled:hover:text-ns-danger',
              ),
        )}
      >
        <svg aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={active ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d={up ? 'M12 19V5M5 12l7-7 7 7' : 'M12 5v14M5 12l7 7 7-7'} />
        </svg>
        <span key={count} className="inline-block animate-fade-up">{count}</span>
      </button>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-0.5 rounded-full bg-ns-surface p-0.5">
        {voteButton('upvote')}
        {voteButton('downvote')}
      </div>
    )
  }

  // Full-size version (collection detail page)
  return (
    <div role="group" aria-label="Vote on this collection" className="inline-flex items-center gap-1 rounded-full bg-ns-surface p-1">
      {voteButton('upvote')}
      <span
        key={votes.score}
        aria-label={`Net score ${votes.score}`}
        className={cn(
          'inline-block min-w-[2.75rem] animate-fade-up px-1 text-center font-heading text-lg font-bold tabular-nums',
          votes.score > 0 ? 'text-ns-success' : votes.score < 0 ? 'text-ns-danger' : 'text-ns-muted',
        )}
      >
        {votes.score > 0 ? '+' : ''}{votes.score}
      </span>
      {voteButton('downvote')}
    </div>
  )
}
