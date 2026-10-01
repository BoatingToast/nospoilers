'use client'

import { useState, useTransition } from 'react'
import { useSession } from 'next-auth/react'
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

  const btn = 'inline-flex min-h-10 items-center justify-center gap-1.5 rounded border px-3 font-body text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40'
  const upClass = userVote === 'upvote'
    ? 'bg-ns-success/15 border-ns-success/40 text-ns-success'
    : 'border-ns-border text-ns-muted hover:border-ns-success/40 hover:text-ns-success'
  const downClass = userVote === 'downvote'
    ? 'bg-ns-danger/15 border-ns-danger/40 text-ns-danger'
    : 'border-ns-border text-ns-muted hover:border-ns-danger/40 hover:text-ns-danger'

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handleVote('upvote')}
          disabled={!isAuthed || isOwner || pending}
          title={isOwner ? 'Cannot vote on your own collection' : 'Upvote'}
          className={`${btn} ${upClass}`}
        >
          <UpIcon active={userVote === 'upvote'} />
          <span>{votes.upvotes}</span>
        </button>

        <button
          onClick={() => handleVote('downvote')}
          disabled={!isAuthed || isOwner || pending}
          title={isOwner ? 'Cannot vote on your own collection' : 'Downvote'}
          className={`${btn} ${downClass}`}
        >
          <DownIcon active={userVote === 'downvote'} />
          <span>{votes.downvotes}</span>
        </button>
      </div>
    )
  }

  // Full-size version (collection detail page): one row with the net score between
  return (
    <div className="flex items-center gap-2">
      {/* Upvote */}
      <button
        onClick={() => handleVote('upvote')}
        disabled={!isAuthed || isOwner || pending}
        title={isOwner ? 'Cannot vote on your own collection' : undefined}
        className={`${btn} min-h-11 text-sm ${upClass}`}
      >
        <UpIcon active={userVote === 'upvote'} size={16} />
        <span>{votes.upvotes}</span>
      </button>

      {/* Net score */}
      <span className={`min-w-[2.5rem] text-center font-body text-sm font-semibold
        ${votes.score > 0 ? 'text-ns-success' : votes.score < 0 ? 'text-ns-danger' : 'text-ns-muted'}`}>
        {votes.score > 0 ? '+' : ''}{votes.score}
      </span>

      {/* Downvote */}
      <button
        onClick={() => handleVote('downvote')}
        disabled={!isAuthed || isOwner || pending}
        title={isOwner ? 'Cannot vote on your own collection' : undefined}
        className={`${btn} min-h-11 text-sm ${downClass}`}
      >
        <DownIcon active={userVote === 'downvote'} size={16} />
        <span>{votes.downvotes}</span>
      </button>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function UpIcon({ active, size = 14 }: { active: boolean; size?: number }) {
  return (
    <svg width={size} height={size} fill={active ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 19V5M5 12l7-7 7 7"/>
    </svg>
  )
}

function DownIcon({ active, size = 14 }: { active: boolean; size?: number }) {
  return (
    <svg width={size} height={size} fill={active ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 5v14M5 12l7 7 7-7"/>
    </svg>
  )
}
