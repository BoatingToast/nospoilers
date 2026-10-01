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

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handleVote('upvote')}
          disabled={!isAuthed || isOwner || pending}
          title={isOwner ? 'Cannot vote on your own collection' : 'Upvote'}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-body transition-all
            ${userVote === 'upvote'
              ? 'bg-ns-success/15 border-ns-success/40 text-ns-success'
              : 'border-ns-border text-ns-muted hover:border-ns-success/30 hover:text-ns-success'
            } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <UpIcon active={userVote === 'upvote'} />
          <span>{votes.upvotes}</span>
        </button>

        <button
          onClick={() => handleVote('downvote')}
          disabled={!isAuthed || isOwner || pending}
          title={isOwner ? 'Cannot vote on your own collection' : 'Downvote'}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-body transition-all
            ${userVote === 'downvote'
              ? 'bg-ns-danger/15 border-ns-danger/40 text-ns-danger'
              : 'border-ns-border text-ns-muted hover:border-ns-danger/30 hover:text-ns-danger'
            } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <DownIcon active={userVote === 'downvote'} />
          <span>{votes.downvotes}</span>
        </button>
      </div>
    )
  }

  // Full-size version (collection detail page)
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Upvote */}
      <button
        onClick={() => handleVote('upvote')}
        disabled={!isAuthed || isOwner || pending}
        title={isOwner ? 'Cannot vote on your own collection' : undefined}
        className={`group w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5
          border transition-all duration-200
          ${userVote === 'upvote'
            ? 'bg-ns-success/15 border-ns-success/50 text-ns-success shadow-[0_0_12px_rgb(var(--ns-success)/0.15)]'
            : 'border-ns-border text-ns-muted hover:border-ns-success/40 hover:text-ns-success hover:bg-ns-success/5'
          } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <UpIcon active={userVote === 'upvote'} size={18} />
        <span className="text-[11px] font-body font-semibold leading-none">{votes.upvotes}</span>
      </button>

      {/* Net score pill */}
      <div className={`px-2.5 py-1 rounded-full border text-xs font-body font-semibold text-center min-w-[40px]
        ${votes.score > 0
          ? 'bg-ns-success/10 border-ns-success/20 text-ns-success'
          : votes.score < 0
          ? 'bg-ns-danger/10 border-ns-danger/20 text-ns-danger'
          : 'bg-ns-surface border-ns-border text-ns-muted'
        }`}>
        {votes.score > 0 ? '+' : ''}{votes.score}
      </div>

      {/* Downvote */}
      <button
        onClick={() => handleVote('downvote')}
        disabled={!isAuthed || isOwner || pending}
        title={isOwner ? 'Cannot vote on your own collection' : undefined}
        className={`group w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5
          border transition-all duration-200
          ${userVote === 'downvote'
            ? 'bg-ns-danger/15 border-ns-danger/50 text-ns-danger shadow-[0_0_12px_rgb(var(--ns-danger)/0.15)]'
            : 'border-ns-border text-ns-muted hover:border-ns-danger/40 hover:text-ns-danger hover:bg-ns-danger/5'
          } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <span className="text-[11px] font-body font-semibold leading-none">{votes.downvotes}</span>
        <DownIcon active={userVote === 'downvote'} size={18} />
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
