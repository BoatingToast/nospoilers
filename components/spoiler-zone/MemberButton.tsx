'use client'

import { useState, useEffect } from 'react'
import Link                    from 'next/link'
import { useSession }          from 'next-auth/react'
import Button                  from '@/components/ui/Button'
import { CheckIcon, PlusIcon } from '@/components/icons'

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
  tmdbId, movieTitle, moviePoster, onMembershipChange,
}: Props) {
  const { data: session } = useSession()
  const [isMember,     setIsMember]     = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [working,      setWorking]      = useState(false)
  const [showLeave,    setShowLeave]    = useState(false)    // hover state on member button

  // On mount, fetch current membership status
  useEffect(() => {
    if (!session?.user) { setLoading(false); return }
    fetch(`/api/spoiler-zone/${tmdbId}/membership`)
      .then(r => r.json())
      .then((d: { isMember: boolean }) => setIsMember(d.isMember))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tmdbId, session?.user])

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
      onMembershipChange?.(true, data.memberCount)
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
      onMembershipChange?.(false, data.memberCount)
    } finally {
      setWorking(false)
    }
  }

  if (!session?.user) {
    return (
      <p className="text-sm text-ns-muted">
        <Link href={`/login?callbackUrl=${encodeURIComponent(`/movie/${tmdbId}`)}`} className="font-semibold text-ns-secondary-readable underline underline-offset-2 transition-colors hover:text-ns-text">
          Sign in
        </Link>{' '}to join
      </p>
    )
  }

  if (loading) {
    return <div className="h-11 w-40 animate-pulse rounded-full bg-ns-surface-2 sm:h-10" />
  }

  if (isMember) {
    return (
      <button
        type="button"
        onMouseEnter={() => setShowLeave(true)}
        onMouseLeave={() => setShowLeave(false)}
        onClick={handleLeave}
        disabled={working}
        className={`inline-flex min-h-11 min-w-28 animate-fade-up items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-150 disabled:cursor-wait disabled:opacity-50 sm:min-h-10
          ${showLeave
            ? 'border-ns-danger bg-ns-danger/10 text-ns-danger'
            : 'border-ns-border-strong text-ns-text'}`}
      >
        <CheckIcon size={14} strokeWidth={2.5} />
        <span>{showLeave ? 'Leave' : 'Member'}</span>
      </button>
    )
  }

  return (
    <Button size="sm" onClick={handleJoin} loading={working} className="min-h-11 sm:min-h-10">
      {!working && <PlusIcon size={14} />}
      Join Spoiler Zone
    </Button>
  )
}
