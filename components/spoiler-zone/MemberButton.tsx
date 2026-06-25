'use client'

import { useState, useEffect } from 'react'
import { useSession }          from 'next-auth/react'
import { CheckIcon }           from '@/components/icons'

interface Props {
  tmdbId:      number
  movieTitle:  string
  moviePoster: string | null
  /** Initial member count (from stats API) */
  initialMemberCount: number
  /** Called when membership state changes */
  onMembershipChange?: (isMember: boolean, memberCount: number) => void
}

export default function MemberButton({
  tmdbId, movieTitle, moviePoster,
  initialMemberCount, onMembershipChange,
}: Props) {
  const { data: session } = useSession()
  const [isMember,     setIsMember]     = useState(false)
  const [memberCount,  setMemberCount]  = useState(initialMemberCount)
  const [loading,      setLoading]      = useState(true)
  const [working,      setWorking]      = useState(false)
  const [showLeave,    setShowLeave]    = useState(false)    // hover state on member button
  const [justJoined,   setJustJoined]  = useState(false)    // triggers animation

  // On mount, fetch current membership status
  useEffect(() => {
    if (!session?.user) { setLoading(false); return }
    fetch(`/api/spoiler-zone/${tmdbId}/membership`)
      .then(r => r.json())
      .then((d: { isMember: boolean }) => setIsMember(d.isMember))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tmdbId, session?.user])

  // Sync initialMemberCount when prop changes
  useEffect(() => { setMemberCount(initialMemberCount) }, [initialMemberCount])

  const handleJoin = async () => {
    if (!session?.user) return
    setWorking(true)
    try {
      const res = await fetch(`/api/spoiler-zone/${tmdbId}/membership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieTitle, moviePoster }),
      })
      if (!res.ok) return
      const data: { memberCount: number } = await res.json()
      setIsMember(true)
      setMemberCount(data.memberCount)
      setJustJoined(true)
      onMembershipChange?.(true, data.memberCount)
      setTimeout(() => setJustJoined(false), 1200)
    } finally {
      setWorking(false)
    }
  }

  const handleLeave = async () => {
    if (!session?.user) return
    setWorking(true)
    setShowLeave(false)
    try {
      const res = await fetch(`/api/spoiler-zone/${tmdbId}/membership`, { method: 'DELETE' })
      if (!res.ok) return
      const data: { memberCount: number } = await res.json()
      setIsMember(false)
      setMemberCount(data.memberCount)
      onMembershipChange?.(false, data.memberCount)
    } finally {
      setWorking(false)
    }
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs font-body text-ns-muted/60">
          <a href="/auth/signin" className="text-ns-gold hover:text-amber-400 transition-colors underline underline-offset-2">
            Sign in
          </a>{' '}to join
        </span>
        <MemberCountPill count={memberCount} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-8 w-32 bg-ns-surface rounded-xl animate-pulse" />
        <MemberCountPill count={memberCount} />
      </div>
    )
  }

  if (isMember) {
    return (
      <div className="flex items-center gap-3">
        <button
          onMouseEnter={() => setShowLeave(true)}
          onMouseLeave={() => setShowLeave(false)}
          onClick={handleLeave}
          disabled={working}
          className={`relative flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-body font-semibold
                      border transition-all duration-200 overflow-hidden
                      ${showLeave
                        ? 'border-red-500/40 text-red-400 bg-red-500/5'
                        : 'border-ns-gold/30 text-ns-gold bg-ns-gold/5 hover:bg-ns-gold/10'}
                      disabled:opacity-50`}
        >
          <CheckIcon size={13} strokeWidth={2.5} />
          <span>{showLeave ? 'Leave' : 'Member'}</span>
        </button>
        <MemberCountPill count={memberCount} />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleJoin}
        disabled={working}
        className={`relative flex items-center gap-2 px-5 py-1.5 rounded-xl text-xs font-body font-bold
                    overflow-hidden transition-all duration-300 disabled:opacity-50
                    ${justJoined
                      ? 'bg-ns-gold text-black scale-105 shadow-lg shadow-ns-gold/20'
                      : 'bg-ns-gold/10 text-ns-gold border border-ns-gold/40 hover:bg-ns-gold hover:text-black hover:shadow-md hover:shadow-ns-gold/20 active:scale-95'
                    }`}
      >
        {working ? (
          <svg className="animate-spin" width="12" height="12" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        ) : (
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5"  x2="12" y2="19" />
            <line x1="5"  y1="12" x2="19" y2="12" />
          </svg>
        )}
        <span>Join Spoiler Zone</span>
      </button>
      <MemberCountPill count={memberCount} />
    </div>
  )
}

function MemberCountPill({ count }: { count: number }) {
  return (
    <span className="text-[10px] font-body text-ns-muted/50 tabular-nums">
      {count.toLocaleString()} {count === 1 ? 'member' : 'members'}
    </span>
  )
}
