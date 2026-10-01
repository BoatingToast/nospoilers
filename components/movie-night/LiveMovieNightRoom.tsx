'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PageHeader from '@/components/ui/PageHeader'
import { formatYear, tmdbImageUrl } from '@/lib/utils'
import {
  ArrowRightIcon,
  CheckIcon,
  ClapperboardIcon,
  CloseIcon,
  FilmIcon,
  FriendsIcon,
  HeartIcon,
  LockIcon,
  ShareIcon,
  ThumbDownIcon,
} from '@/components/icons'
import type { MovieNightLiveCandidate, MovieNightLiveState, MovieNightVoteValue } from '@/types'

const MOOD_LABELS: Record<string, string> = {
  crowd: 'Crowd Pleaser',
  tense: 'Tense',
  chill: 'Chill',
  deep: 'Deep Cut',
  wildcard: 'Wildcard',
}

function storageKey(code: string) {
  return `nospoilers:movie-night:${code}`
}

function CandidateMeta({ candidate }: { candidate: MovieNightLiveCandidate }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-body text-ns-muted">
      <span>{formatYear(candidate.releaseDate)}</span>
      <span>{candidate.runtime ? `${candidate.runtime} min` : 'Runtime open'}</span>
      <span className="text-ns-secondary-readable font-semibold">{candidate.groupFit}% group fit</span>
    </div>
  )
}

function MatchReveal({ room, onShare }: { room: MovieNightLiveState; onShare: () => void }) {
  const match = room.matchedCandidate
  if (!match) return null

  return (
    <div className="min-w-0">
      <PageHeader
        title="IT'S A MATCH"
        lede={<>{room.participantCount} voters found tonight&apos;s pick.</>}
      >
        <Badge variant="success" size="md">
          {room.matchKind === 'unanimous' ? 'Everyone said watch' : 'Best group consensus'}
        </Badge>
      </PageHeader>

      <section className="mt-10 grid min-w-0 gap-7 sm:grid-cols-[240px_minmax(0,1fr)]">
        <Link href={`/movie/${match.tmdbId}`} className="relative w-full max-w-[240px] aspect-[2/3] rounded overflow-hidden bg-ns-border">
          <Image
            src={tmdbImageUrl(match.posterPath, 'w500')}
            alt={match.title}
            fill
            className="object-cover"
            sizes="240px"
            priority
          />
        </Link>

        <div className="min-w-0 border-t-2 border-ns-text pt-4">
          <h2 className="font-display text-4xl leading-none tracking-wide text-white sm:text-5xl">{match.title}</h2>
          <p className="mt-2 text-sm font-body text-ns-secondary-readable">Tonight&apos;s movie</p>
          <div className="mt-3"><CandidateMeta candidate={match} /></div>
          <p className="text-sm font-body text-ns-muted leading-relaxed mt-5 max-w-2xl">{match.explanation}</p>

          <div className="flex flex-wrap gap-3 mt-7">
            <Button href={`/movie/${match.tmdbId}`} variant="primary">
              <FilmIcon size={16} />
              Open movie
            </Button>
            <Button onClick={onShare} variant="secondary">
              <ShareIcon size={16} />
              Share result
            </Button>
            <Button href="/movie-night" variant="outline">New room</Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function NoMatchReveal({ room }: { room: MovieNightLiveState }) {
  return (
    <PageHeader
      title="KEEP LOOKING"
      lede={<>Everyone passed on every pick in {room.name}. NoSpoilers won&apos;t force a winner the group rejected.</>}
    >
      <Badge variant="warning" size="md">No group match</Badge>
      <div className="flex w-full flex-wrap gap-3">
        <Button href="/movie-night" variant="primary">Adjust picks and try again</Button>
        <Button href="/search" variant="outline">Explore movies</Button>
      </div>
    </PageHeader>
  )
}

function MovieNightLobby({
  room,
  isHost,
  starting,
  onShare,
  onStart,
}: {
  room: MovieNightLiveState
  isHost: boolean
  starting: boolean
  onShare: () => void
  onStart: () => void
}) {
  const readyToStart = room.participantCount >= 2

  return (
    <section className="grid min-w-0 gap-10 items-start lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="min-w-0 border-t-2 border-ns-text pt-4">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-4xl sm:text-5xl leading-none tracking-wide text-white">GET EVERYONE IN</h2>
            <Badge variant="secondary" size="md">Lobby open</Badge>
          </div>
          <p className="text-sm sm:text-base font-body text-ns-muted leading-relaxed mt-3 max-w-xl">
            The roster locks when voting starts. Share the room code, make sure everyone is here, then let the host begin the ballot for the whole group.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button onClick={onShare} variant="secondary" size="lg">
              <ShareIcon size={17} /> Share lobby
            </Button>
            {isHost ? (
              <Button
                onClick={onStart}
                loading={starting}
                disabled={!readyToStart}
                size="lg"
              >
                <ArrowRightIcon size={17} /> Start voting
              </Button>
            ) : (
              <div className="text-sm font-body text-ns-muted" aria-live="polite">
                Waiting for the host to start
              </div>
            )}
          </div>

          {isHost && !readyToStart && (
            <p className="text-xs font-body text-ns-muted mt-3">Invite at least one other voter to enable Start voting.</p>
          )}
        </div>
      </div>

      <ParticipantPanel room={room} />
    </section>
  )
}

export default function LiveMovieNightRoom({
  code,
  initialDisplayName,
}: {
  code: string
  initialDisplayName: string
}) {
  const tokenRef = useRef<string | null>(null)
  const roomStatusRef = useRef<MovieNightLiveState['status'] | null>(null)
  const [room, setRoom] = useState<MovieNightLiveState | null>(null)
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [starting, setStarting] = useState(false)
  const [voting, setVoting] = useState(false)
  const [error, setError] = useState('')
  const [shared, setShared] = useState(false)

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/movie-night/rooms/${encodeURIComponent(code)}`, {
        headers: tokenRef.current ? { 'x-movie-night-token': tokenRef.current } : {},
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not load this room')
      roomStatusRef.current = data.status
      setRoom(data)
      setError('')
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load this room')
      return false
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => {
    tokenRef.current = window.localStorage.getItem(storageKey(code))
    let timeout: number | null = null
    let stopped = false
    let failures = 0

    const schedule = (delay: number) => {
      if (!stopped) timeout = window.setTimeout(() => { void poll() }, delay)
    }
    const poll = async () => {
      if (stopped) return
      if (document.visibilityState !== 'visible') {
        schedule(10_000)
        return
      }

      const ok = await refresh()
      failures = ok ? 0 : Math.min(failures + 1, 3)
      const status = roomStatusRef.current
      if (status === 'matched' || status === 'no_match' || status === 'closed') return

      const baseDelay = status === 'lobby' ? 2_000 : 5_000
      schedule(Math.min(30_000, baseDelay * (2 ** failures)))
    }
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (timeout) window.clearTimeout(timeout)
      void poll()
    }

    void poll()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      stopped = true
      if (timeout) window.clearTimeout(timeout)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [code, refresh])

  async function joinRoom() {
    if (!displayName.trim()) {
      setError('Enter your name to join')
      return
    }

    setJoining(true)
    setError('')
    try {
      const response = await fetch(`/api/movie-night/rooms/${encodeURIComponent(code)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not join the room')
      tokenRef.current = data.token
      window.localStorage.setItem(storageKey(code), data.token)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not join the room')
    } finally {
      setJoining(false)
    }
  }

  async function castVote(candidateId: string, value: MovieNightVoteValue) {
    if (!tokenRef.current || voting) return
    setVoting(true)
    setError('')
    try {
      const response = await fetch(`/api/movie-night/rooms/${encodeURIComponent(code)}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-movie-night-token': tokenRef.current,
        },
        body: JSON.stringify({ candidateId, value }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not save your vote')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your vote')
    } finally {
      setVoting(false)
    }
  }

  async function startVoting() {
    if (!tokenRef.current || starting) return
    setStarting(true)
    setError('')
    try {
      const response = await fetch(`/api/movie-night/rooms/${encodeURIComponent(code)}/start`, {
        method: 'POST',
        headers: { 'x-movie-night-token': tokenRef.current },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not start voting')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start voting')
    } finally {
      setStarting(false)
    }
  }

  async function shareRoom(result = false) {
    const url = window.location.href
    const text = result && room?.matchedCandidate
      ? `${room.name} matched on ${room.matchedCandidate.title}.`
      : `Vote in ${room?.name ?? 'our Movie Night'} on NoSpoilers: ${url}`

    if (navigator.share) {
      await navigator.share({ title: room?.name ?? 'Movie Night Live', text, url }).catch(() => undefined)
    } else {
      await navigator.clipboard.writeText(result ? `${text} ${url}` : url)
    }
    setShared(true)
    window.setTimeout(() => setShared(false), 1600)
  }

  if (loading) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-ns-border border-t-ns-secondary animate-spin mx-auto" />
          <p className="text-sm font-body text-ns-muted mt-4">Opening the room...</p>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12 min-h-[65vh]">
        <PageHeader
          title="Room unavailable"
          lede={error || 'This room does not exist or has expired.'}
        >
          <Button href="/movie-night" variant="primary">Create a room</Button>
        </PageHeader>
      </div>
    )
  }

  if (room.status === 'matched') {
    return (
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <MatchReveal room={room} onShare={() => void shareRoom(true)} />
      </div>
    )
  }

  if (room.status === 'no_match') {
    return (
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <NoMatchReveal room={room} />
      </div>
    )
  }

  if (room.status === 'closed') {
    return (
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12 min-h-[65vh]">
        <PageHeader
          title="This vote has ended"
          lede="Start a fresh room to build a new group ballot."
        >
          <Badge variant="muted" size="md">Room closed</Badge>
          <Button href="/movie-night" variant="primary">Create a new room</Button>
        </PageHeader>
      </div>
    )
  }

  const votedCount = room.candidates.filter(candidate => candidate.myVote).length
  const currentCandidate = room.candidates.find(candidate => !candidate.myVote) ?? null
  const joined = Boolean(room.participantId)
  const currentParticipant = room.participants.find(participant => participant.id === room.participantId) ?? null
  const isHost = currentParticipant?.isHost === true

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <PageHeader
        title={room.name}
        lede={room.status === 'lobby'
          ? 'Gather the whole group. The host starts the ballot when everyone is ready.'
          : 'Votes stay private. The first unanimous pick wins.'}
        className="mb-10"
      >
        <button
          type="button"
          onClick={() => void shareRoom()}
          className="flex min-h-10 items-center gap-3 rounded border border-ns-text/70 px-4 py-2 hover:bg-ns-surface transition-colors"
        >
          <span className="text-left">
            <span className="block text-[11px] uppercase tracking-widest font-body text-ns-muted">Room code</span>
            <span className="block font-display tracking-[0.18em] text-lg leading-tight text-white">{room.code}</span>
          </span>
          {shared ? <CheckIcon size={17} className="text-ns-success" /> : <ShareIcon size={17} className="text-ns-secondary-readable" />}
        </button>
        <Badge variant="secondary">Movie Night Live</Badge>
        <Badge variant="outline">{MOOD_LABELS[room.mood] ?? room.mood}</Badge>
      </PageHeader>

      {error && (
        <div className="mb-6 border-l-2 border-ns-danger py-1 pl-3 text-sm font-body text-ns-danger">
          {error}
        </div>
      )}

      {room.status === 'lobby' && joined ? (
        <MovieNightLobby
          room={room}
          isHost={isHost}
          starting={starting}
          onShare={() => void shareRoom()}
          onStart={() => void startVoting()}
        />
      ) : room.status === 'lobby' ? (
        <section className="grid min-w-0 gap-10 items-start lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0 border-t-2 border-ns-text pt-4">
            <div className="max-w-xl">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-4xl sm:text-5xl leading-none tracking-wide text-white">PICK TOGETHER</h2>
                <Badge variant="secondary" size="md">You&apos;re invited</Badge>
              </div>
              <p className="text-sm sm:text-base font-body text-ns-muted leading-relaxed mt-3">
                Join the lobby now. Once everyone is in, the host will start {room.candidates.length} private, spoiler-free picks for the whole group.
              </p>

              <div className="max-w-sm mt-8 space-y-3">
                <Input
                  id="movie-night-display-name"
                  label="Your name"
                  value={displayName}
                  maxLength={40}
                  autoFocus
                  onChange={event => setDisplayName(event.target.value)}
                  onKeyDown={event => { if (event.key === 'Enter') void joinRoom() }}
                  placeholder="How friends will see you"
                />
                <Button onClick={joinRoom} loading={joining} className="w-full" size="lg">
                  Join the lobby
                  <ArrowRightIcon size={17} />
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs font-body text-ns-muted mt-5">
                <LockIcon size={14} className="text-ns-secondary-readable" />
                No account required. Your ballot is private.
              </div>
            </div>
          </div>

          <ParticipantPanel room={room} />
        </section>
      ) : !joined ? (
        <section className="grid min-w-0 gap-10 items-start lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0 border-t-2 border-ns-text pt-4">
            <div className="max-w-xl">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-3xl sm:text-4xl leading-none tracking-wide text-white">Voting is already underway</h2>
                <Badge variant="warning">Roster locked</Badge>
              </div>
              <p className="text-sm font-body text-ns-muted leading-relaxed mt-3">
                This room stopped accepting new voters when the host started the ballot. Ask the host to create a new room if you were missed.
              </p>
              <Button href="/movie-night" variant="primary" className="mt-6">Create or join another room</Button>
            </div>
          </div>
          <ParticipantPanel room={room} />
        </section>
      ) : (
        <section className="grid min-w-0 gap-10 items-start lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0 border-t-2 border-ns-text pt-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <p className="text-sm font-heading font-semibold text-white">Your ballot</p>
              <p className="text-xs font-body text-ns-muted">{votedCount} of {room.candidates.length}</p>
            </div>
            <div className="h-1 bg-ns-surface-2 overflow-hidden mb-6">
              <div
                className="h-full bg-ns-secondary transition-all duration-300"
                style={{ width: `${room.candidates.length ? (votedCount / room.candidates.length) * 100 : 0}%` }}
              />
            </div>

            {currentCandidate ? (
              <article className="min-w-0">
                <div className="grid gap-6 sm:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="relative aspect-[2/3] w-full max-w-[220px] overflow-hidden rounded bg-ns-border">
                    <Image
                      src={tmdbImageUrl(currentCandidate.posterPath, 'w500')}
                      alt={currentCandidate.title}
                      fill
                      className="object-cover"
                      sizes="220px"
                      priority
                    />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <h2 className="font-display text-4xl sm:text-5xl leading-none tracking-wide text-white">{currentCandidate.title}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <Badge variant="secondary">Pick {votedCount + 1}</Badge>
                      <Badge variant="success">{currentCandidate.groupFit}% fit</Badge>
                    </div>
                    <div className="mt-3"><CandidateMeta candidate={currentCandidate} /></div>
                    <p className="text-sm font-body text-ns-muted leading-relaxed mt-5">{currentCandidate.explanation}</p>

                    <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-7">
                      <button
                        type="button"
                        disabled={voting}
                        onClick={() => void castVote(currentCandidate.id, 'pass')}
                        className="rounded border border-ns-danger/25 bg-ns-danger/5 px-3 py-4 text-ns-danger hover:bg-ns-danger/15 transition-colors disabled:opacity-50"
                      >
                        <ThumbDownIcon size={20} className="mx-auto mb-2" />
                        <span className="text-xs font-body font-semibold">Pass</span>
                      </button>
                      <button
                        type="button"
                        disabled={voting}
                        onClick={() => void castVote(currentCandidate.id, 'maybe')}
                        className="rounded border border-ns-warning/25 bg-ns-warning/5 px-3 py-4 text-ns-warning hover:bg-ns-warning/15 transition-colors disabled:opacity-50"
                      >
                        <FilmIcon size={20} className="mx-auto mb-2" />
                        <span className="text-xs font-body font-semibold">Maybe</span>
                      </button>
                      <button
                        type="button"
                        disabled={voting}
                        onClick={() => void castVote(currentCandidate.id, 'watch')}
                        className="rounded border border-ns-success/25 bg-ns-success/5 px-3 py-4 text-ns-success hover:bg-ns-success/15 transition-colors disabled:opacity-50"
                      >
                        <HeartIcon size={20} className="mx-auto mb-2" />
                        <span className="text-xs font-body font-semibold">Watch</span>
                      </button>
                    </div>

                    <p className="flex items-center gap-1.5 text-xs font-body text-ns-muted mt-4">
                      <LockIcon size={12} /> Only your progress is visible to the group.
                    </p>
                  </div>
                </div>
              </article>
            ) : (
              <div className="min-h-[240px]">
                <div>
                  <h2 className="font-display text-3xl sm:text-4xl leading-none tracking-wide text-white">Ballot complete</h2>
                  <p className="text-sm font-body text-ns-muted mt-2 max-w-sm">
                    Waiting for the rest of the room. This page will reveal the match automatically.
                  </p>
                  <Button onClick={() => void shareRoom()} variant="secondary" className="mt-6">
                    <ShareIcon size={15} /> Share room
                  </Button>
                </div>
              </div>
            )}
          </div>

          <ParticipantPanel room={room} />
        </section>
      )}
    </div>
  )
}

function ParticipantPanel({ room }: { room: MovieNightLiveState }) {
  const inLobby = room.status === 'lobby'

  return (
    <aside className="min-w-0 border-t-2 border-ns-text pt-4 lg:sticky lg:top-28">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-display text-2xl leading-none tracking-wide text-white">In the room</h2>
        <span className="text-xs font-body text-ns-muted">{room.participantCount}/12</span>
      </div>

      <div className="border-t border-ns-border">
        {room.participants.map(participant => {
          const progress = room.candidates.length
            ? Math.min(100, (participant.voteCount / room.candidates.length) * 100)
            : 0
          return (
            <div key={participant.id} className="border-b border-ns-border py-3">
              <div className="flex items-center gap-3">
                <Avatar src={participant.avatarUrl} username={participant.displayName} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-body text-white truncate">{participant.displayName}</p>
                    {participant.isHost && <Badge variant="secondary">Host</Badge>}
                  </div>
                  <p className="text-[11px] font-body text-ns-muted mt-0.5">
                    {inLobby ? 'Ready in lobby' : participant.finished ? 'Ballot complete' : `${participant.voteCount} of ${room.candidates.length}`}
                  </p>
                </div>
                {(inLobby || participant.finished) && <CheckIcon size={16} className="text-ns-success flex-shrink-0" />}
              </div>
              {!inLobby && (
                <div className="h-1 bg-ns-border/70 overflow-hidden mt-2.5">
                  <div className="h-full bg-ns-secondary transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="pt-4 flex items-start gap-2 text-xs font-body text-ns-muted leading-relaxed">
        <LockIcon size={13} className="text-ns-secondary-readable flex-shrink-0 mt-0.5" />
        {inLobby
          ? 'The roster locks when the host starts voting.'
          : 'Ballot choices stay hidden—even from the host.'}
      </div>
    </aside>
  )
}
