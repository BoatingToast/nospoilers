'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatYear, tmdbImageUrl } from '@/lib/utils'
import {
  ArrowRightIcon,
  CheckIcon,
  FilmIcon,
  HeartIcon,
  LockIcon,
  ShareIcon,
  ThumbDownIcon,
} from '@/components/icons'
import type { MovieNightLiveCandidate, MovieNightLiveState, MovieNightVoteValue } from '@/types'
import styles from './movie-night.module.css'

const MOOD_LABELS: Record<string, string> = {
  crowd: 'Crowd pleaser',
  tense: 'Tense',
  chill: 'Chill',
  deep: 'Deep cut',
  wildcard: 'Wildcard',
}

const ROOM_CAPACITY = 12

const VOTE_OPTIONS: Array<{
  value: MovieNightVoteValue
  label: string
  Icon: typeof HeartIcon
  tone: string
  fly: string
}> = [
  { value: 'pass', label: 'Pass', Icon: ThumbDownIcon, tone: 'bg-ns-surface-2 text-ns-text hover:bg-ns-surface-3', fly: styles.flyPass },
  { value: 'maybe', label: 'Maybe', Icon: FilmIcon, tone: 'bg-ns-surface-2 text-ns-text hover:bg-ns-surface-3', fly: styles.flyMaybe },
  { value: 'watch', label: 'Watch', Icon: HeartIcon, tone: 'bg-ns-secondary text-ns-secondary-foreground hover:bg-ns-secondary-hover', fly: styles.flyWatch },
]

const stagger = (index: number) => ({ '--i': Math.min(index, 7) }) as CSSProperties

function storageKey(code: string) {
  return `nospoilers:movie-night:${code}`
}

function CandidateMeta({ candidate }: { candidate: MovieNightLiveCandidate }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ns-muted">
      <span>{formatYear(candidate.releaseDate)}</span>
      <span>{candidate.runtime ? `${candidate.runtime} min` : 'Runtime open'}</span>
      <span className="font-semibold text-ns-secondary-readable">{candidate.groupFit}% group fit</span>
    </div>
  )
}

function LiveDot() {
  return (
    <span aria-hidden="true" className={`relative block h-2.5 w-2.5 flex-shrink-0 rounded-full bg-ns-accent text-ns-accent ${styles.ping}`} />
  )
}

function RoomContext({ room }: { room: MovieNightLiveState }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <LiveDot />
      <p className="min-w-0 break-words font-heading text-lg font-semibold text-ns-text">{room.name}</p>
      <Badge variant="muted">{MOOD_LABELS[room.mood] ?? room.mood}</Badge>
    </div>
  )
}

function RoomCodeButton({ room, shared, onShare }: { room: MovieNightLiveState; shared: boolean; onShare: () => void }) {
  return (
    <button
      type="button"
      onClick={onShare}
      className="flex min-h-14 flex-shrink-0 items-center gap-4 self-start rounded-full bg-ns-surface-2 px-6 py-2 text-left transition-colors duration-150 hover:bg-ns-surface-3 sm:self-auto"
    >
      <span>
        <span className="block text-xs text-ns-muted">Room code</span>
        <span className="block font-display text-lg tabular-nums text-ns-text">{room.code}</span>
      </span>
      {shared
        ? <CheckIcon size={18} className="animate-fade-up text-ns-success motion-reduce:animate-none" />
        : <ShareIcon size={18} className="text-ns-secondary-readable" />}
    </button>
  )
}

function RoomCodeTiles({ code }: { code: string }) {
  return (
    <div className="mt-8 sm:mt-10">
      <p className="text-sm font-semibold text-ns-muted">Room code</p>
      <p className="mt-3 flex max-w-lg gap-1.5 sm:gap-2">
        <span className="sr-only">{code}</span>
        {code.split('').map((character, index) => (
          <span
            key={`${character}-${index}`}
            aria-hidden="true"
            style={stagger(index)}
            className={`flex h-16 min-w-0 flex-1 items-center justify-center rounded-xl bg-ns-bg font-display text-3xl text-ns-text sm:h-24 sm:text-5xl ${styles.codeTile}`}
          >
            {character}
          </span>
        ))}
      </p>
    </div>
  )
}

function MatchReveal({ room, onShare }: { room: MovieNightLiveState; onShare: () => void }) {
  const match = room.matchedCandidate
  if (!match) return null

  return (
    <section className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-ns-surface">
      <div aria-hidden="true" className={styles.curtain}>
        <span className={`text-center font-display text-5xl sm:text-7xl lg:text-8xl ${styles.curtainWord}`}>It&apos;s a match</span>
      </div>

      <div className="grid grid-cols-1 items-center gap-8 p-6 sm:p-10 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-14 lg:p-14">
        <Link
          href={`/movie/${match.tmdbId}`}
          className={`group relative mx-auto block aspect-[2/3] w-40 overflow-hidden rounded-xl bg-ns-surface-2 shadow-2xl sm:w-64 md:w-full ${styles.matchPoster}`}
        >
          <Image
            src={tmdbImageUrl(match.posterPath, 'w500')}
            alt={match.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 256px, 320px"
            priority
          />
        </Link>

        <div className="min-w-0">
          <div className={styles.matchRise} style={stagger(0)}>
            <Badge variant="success" size="md">
              {room.matchKind === 'unanimous' ? 'Everyone said watch' : 'Best group consensus'}
            </Badge>
            <h1 className="mt-4 font-display text-5xl text-ns-text sm:text-6xl lg:text-7xl">It&apos;s a match.</h1>
            <p className="mt-3 text-lg text-ns-muted">{room.participantCount} voters found tonight&apos;s pick.</p>
          </div>

          <div className={`mt-8 border-t border-ns-border pt-6 ${styles.matchRise}`} style={stagger(1)}>
            <p className="text-sm font-semibold text-ns-secondary-readable">Tonight&apos;s movie</p>
            <h2 className="mt-1 break-words font-display text-3xl text-ns-text sm:text-4xl">{match.title}</h2>
            <div className="mt-3"><CandidateMeta candidate={match} /></div>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ns-muted">{match.explanation}</p>
          </div>

          <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Voters">
            {room.participants.map((participant, index) => (
              <li key={participant.id} className={styles.matchVoter} style={stagger(index)}>
                <Avatar src={participant.avatarUrl} username={participant.displayName} size="sm" />
              </li>
            ))}
          </ul>

          <div className={`mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap ${styles.matchRise}`} style={stagger(3)}>
            <Button href={`/movie/${match.tmdbId}`} variant="primary" size="lg">
              <FilmIcon size={17} />
              Open movie
            </Button>
            <Button onClick={onShare} variant="outline" size="lg">
              <ShareIcon size={17} />
              Share result
            </Button>
            <Button href="/movie-night" variant="ghost" size="lg">New room</Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function NoMatchReveal({ room }: { room: MovieNightLiveState }) {
  return (
    <section className={`mx-auto max-w-3xl rounded-3xl bg-ns-surface px-6 py-12 text-center sm:px-12 sm:py-16 ${styles.stage}`}>
      {room.candidates.length > 0 && (
        <div aria-hidden="true" className="mx-auto mb-8 flex max-w-md justify-center gap-2">
          {room.candidates.slice(0, 5).map((candidate, index) => (
            <div
              key={candidate.id}
              style={stagger(index)}
              className={`relative aspect-[2/3] min-w-0 flex-1 overflow-hidden rounded-xl bg-ns-surface-2 ${styles.arrive}`}
            >
              <Image
                src={tmdbImageUrl(candidate.posterPath, 'w185')}
                alt=""
                fill
                className="object-cover opacity-40 grayscale"
                sizes="96px"
              />
            </div>
          ))}
        </div>
      )}
      <Badge variant="warning" size="md">No group match</Badge>
      <h1 className="mt-4 font-display text-4xl text-ns-text sm:text-5xl">Keep looking.</h1>
      <p className="mx-auto mt-3 max-w-lg text-lg leading-relaxed text-ns-muted">
        Everyone passed on every pick in {room.name}. NoSpoilers won&apos;t force a winner the group rejected.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
        <Button href="/movie-night" variant="primary" size="lg">Adjust picks and try again</Button>
        <Button href="/search" variant="outline" size="lg">Explore movies</Button>
      </div>
    </section>
  )
}

function MovieNightLobby({
  room,
  isHost,
  starting,
  shared,
  onShare,
  onStart,
}: {
  room: MovieNightLiveState
  isHost: boolean
  starting: boolean
  shared: boolean
  onShare: () => void
  onStart: () => void
}) {
  const readyToStart = room.participantCount >= 2

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-3xl bg-ns-surface p-7 sm:p-10 lg:p-14">
        <RoomContext room={room} />
        <h1 className="mt-5 font-display text-5xl text-ns-text sm:text-6xl lg:text-7xl">Get everyone in.</h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-ns-muted">
          The roster locks when voting starts. Share the room code, make sure everyone is here, then let the host begin the ballot for the whole group.
        </p>

        <RoomCodeTiles code={room.code} />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {isHost ? (
            <Button onClick={onStart} loading={starting} disabled={!readyToStart} size="lg">
              Start voting
              <ArrowRightIcon size={17} />
            </Button>
          ) : (
            <div className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-ns-surface-2 px-7 text-base font-semibold text-ns-text" aria-live="polite">
              <LiveDot />
              Waiting for the host to start
            </div>
          )}
          <Button onClick={onShare} variant="outline" size="lg">
            {shared ? <CheckIcon size={17} /> : <ShareIcon size={17} />}
            Share lobby
          </Button>
        </div>

        {isHost && !readyToStart && (
          <p className="mt-4 text-sm text-ns-muted">Invite at least one other voter to enable Start voting.</p>
        )}
      </section>

      <ParticipantPanel room={room} />
    </div>
  )
}

function BallotWaiting({ room, onShare }: { room: MovieNightLiveState; onShare: () => void }) {
  const finished = room.participants.filter(participant => participant.finished).length
  const total = Math.max(room.participants.length, 1)

  return (
    <div className="flex min-h-[28rem] flex-col items-center justify-center px-6 py-14 text-center">
      <p className="font-display text-7xl tabular-nums text-ns-text sm:text-8xl">
        <span key={finished} className="inline-block animate-fade-up motion-reduce:animate-none">{finished}</span>
        <span className="text-ns-subtle"> of {room.participants.length}</span>
      </p>
      <p className="mt-2 text-base text-ns-muted">ballots in</p>
      <div aria-hidden="true" className="mt-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-ns-surface-2">
        <div
          className={`h-full rounded-full bg-ns-secondary ${styles.meter}`}
          style={{ transform: `scaleX(${finished / total})` }}
        />
      </div>
      <h2 className="mt-8 font-heading text-2xl font-bold text-ns-text">Ballot complete</h2>
      <p className="mt-2 max-w-sm text-base leading-relaxed text-ns-muted">
        Waiting for the rest of the room. This page will reveal the match automatically.
      </p>
      <Button onClick={onShare} variant="outline" className="mt-6">
        <ShareIcon size={15} /> Share room
      </Button>
    </div>
  )
}

const BALLOT_GRID = 'grid grid-cols-1 gap-6 p-5 sm:gap-8 sm:p-8 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-12 lg:p-10'
const BALLOT_POSTER = 'relative mx-auto aspect-[2/3] w-44 overflow-hidden rounded-xl bg-ns-surface-2 sm:w-56 md:w-full'

function VotingBooth({
  room,
  voting,
  shared,
  onVote,
  onShare,
}: {
  room: MovieNightLiveState
  voting: boolean
  shared: boolean
  onVote: (candidateId: string, value: MovieNightVoteValue) => void
  onShare: () => void
}) {
  const votedCount = room.candidates.filter(candidate => candidate.myVote).length
  const currentCandidate = room.candidates.find(candidate => !candidate.myVote) ?? null
  const [choice, setChoice] = useState<{ id: string; value: MovieNightVoteValue } | null>(null)
  const [previous, setPrevious] = useState(currentCandidate)
  const [leaving, setLeaving] = useState<{ candidate: MovieNightLiveCandidate; value: MovieNightVoteValue } | null>(null)

  // The card only flies away once the server has accepted the vote and moved on.
  if ((currentCandidate?.id ?? null) !== (previous?.id ?? null)) {
    setLeaving(previous && choice?.id === previous.id ? { candidate: previous, value: choice.value } : null)
    setPrevious(currentCandidate)
  }

  const leavingOption = leaving ? VOTE_OPTIONS.find(option => option.value === leaving.value) : null

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="break-words font-display text-3xl text-ns-text sm:text-4xl">{room.name}</h1>
            <p className="mt-2 text-base text-ns-muted">Votes stay private. The first unanimous pick wins.</p>
          </div>
          <RoomCodeButton room={room} shared={shared} onShare={onShare} />
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-ns-text">Your ballot</p>
          <p className="text-sm tabular-nums text-ns-muted">
            <span key={votedCount} className="inline-block animate-fade-up motion-reduce:animate-none">{votedCount}</span> of {room.candidates.length}
          </p>
        </div>
        <div aria-hidden="true" className="mb-5 mt-2 flex gap-1.5">
          {room.candidates.map(candidate => (
            <span key={candidate.id} className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ns-surface-2">
              <span
                className={`block h-full rounded-full bg-ns-secondary ${styles.meter}`}
                style={{ transform: `scaleX(${candidate.myVote ? 1 : 0})` }}
              />
            </span>
          ))}
        </div>

        <div className="relative isolate overflow-hidden rounded-3xl bg-ns-surface">
          {currentCandidate ? (
            <article key={currentCandidate.id} className={`${BALLOT_GRID} ${styles.cardIn}`}>
              <div className={BALLOT_POSTER}>
                <Image
                  src={tmdbImageUrl(currentCandidate.posterPath, 'w500')}
                  alt={currentCandidate.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 176px, (max-width: 768px) 224px, 300px"
                  priority
                />
              </div>

              <div className="flex min-w-0 flex-col justify-center">
                <p className="text-sm font-semibold text-ns-secondary-readable">Pick {votedCount + 1}</p>
                <h2 className="mt-2 break-words font-display text-3xl text-ns-text sm:text-5xl">{currentCandidate.title}</h2>
                <div className="mt-3"><CandidateMeta candidate={currentCandidate} /></div>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-ns-muted">{currentCandidate.explanation}</p>

                <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
                  {VOTE_OPTIONS.map(({ value, label, Icon, tone }) => (
                    <button
                      key={value}
                      type="button"
                      disabled={voting}
                      onClick={() => {
                        setChoice({ id: currentCandidate.id, value })
                        onVote(currentCandidate.id, value)
                      }}
                      className={[
                        'inline-flex min-h-14 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition-[background-color,transform] duration-150 active:scale-[0.97] disabled:cursor-wait sm:gap-2 sm:text-base',
                        tone,
                        voting && choice?.id === currentCandidate.id && choice.value === value ? 'ring-2 ring-ns-text' : '',
                      ].join(' ')}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                </div>

                <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-ns-muted md:justify-start">
                  <LockIcon size={13} /> Only your progress is visible to the group.
                </p>
              </div>
            </article>
          ) : (
            <div key="waiting" className={styles.cardIn}>
              <BallotWaiting room={room} onShare={onShare} />
            </div>
          )}

          {leaving && leavingOption && (
            <div aria-hidden="true" className={`pointer-events-none absolute inset-0 z-10 ${BALLOT_GRID}`}>
              <div
                className={`${BALLOT_POSTER} shadow-2xl ${styles.ghost} ${leavingOption.fly}`}
                onAnimationEnd={() => setLeaving(null)}
              >
                <Image
                  src={tmdbImageUrl(leaving.candidate.posterPath, 'w500')}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 176px, (max-width: 768px) 224px, 300px"
                />
                <span className="absolute left-3 top-3 rounded-full bg-ns-text px-3 py-1 text-sm font-bold text-ns-bg">
                  {leavingOption.label}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <ParticipantPanel room={room} />
    </div>
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
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-16">
        <p role="status" className="sr-only">Opening the room...</p>
        <div aria-hidden="true" className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-3xl bg-ns-surface p-7 sm:p-10 lg:p-14">
            <Skeleton className="h-5 w-48 bg-ns-surface-2" />
            <Skeleton className="mt-6 h-14 w-full max-w-md bg-ns-surface-2" />
            <Skeleton className="mt-5 h-5 w-full max-w-xl bg-ns-surface-2" />
            <Skeleton className="mt-2 h-5 w-2/3 max-w-sm bg-ns-surface-2" />
            <div className="mt-10 flex max-w-lg gap-2">
              {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-16 flex-1 rounded-xl bg-ns-surface-2 sm:h-24" />)}
            </div>
          </div>
          <div className="space-y-4 rounded-2xl bg-ns-surface p-6">
            <Skeleton className="h-5 w-28 bg-ns-surface-2" />
            {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-12 w-full bg-ns-surface-2" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center px-4 py-10 sm:px-6">
        <section className={`w-full max-w-lg rounded-3xl bg-ns-surface p-8 text-center sm:p-12 ${styles.stage}`}>
          <h1 className="font-display text-4xl text-ns-text">Room unavailable</h1>
          <p role="alert" className="mt-3 text-lg leading-relaxed text-ns-muted">{error || 'This room does not exist or has expired.'}</p>
          <Button href="/movie-night" variant="primary" size="lg" className="mt-7">Create a room</Button>
        </section>
      </div>
    )
  }

  if (room.status === 'matched') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-16">
        <MatchReveal room={room} onShare={() => void shareRoom(true)} />
      </div>
    )
  }

  if (room.status === 'no_match') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-16">
        <NoMatchReveal room={room} />
      </div>
    )
  }

  if (room.status === 'closed') {
    return (
      <div className="flex min-h-[65vh] items-center justify-center px-4 py-10 sm:px-6">
        <section className={`w-full max-w-lg rounded-3xl bg-ns-surface p-8 text-center sm:p-12 ${styles.stage}`}>
          <Badge variant="muted" size="md">Room closed</Badge>
          <h1 className="mt-4 font-display text-4xl text-ns-text">This vote has ended</h1>
          <p className="mt-3 text-lg leading-relaxed text-ns-muted">Start a fresh room to build a new group ballot.</p>
          <Button href="/movie-night" variant="primary" size="lg" className="mt-7">Create a new room</Button>
        </section>
      </div>
    )
  }

  const joined = Boolean(room.participantId)
  const currentParticipant = room.participants.find(participant => participant.id === room.participantId) ?? null
  const isHost = currentParticipant?.isHost === true
  const stage = room.status === 'lobby' ? (joined ? 'lobby' : 'invite') : joined ? 'ballot' : 'locked'

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      {error && stage !== 'invite' && (
        <div role="alert" className="mb-5 animate-fade-up rounded-xl bg-ns-danger/10 px-4 py-3 text-sm text-ns-danger motion-reduce:animate-none">
          {error}
        </div>
      )}

      <div key={stage} className={styles.stage}>
        {stage === 'lobby' ? (
          <MovieNightLobby
            room={room}
            isHost={isHost}
            starting={starting}
            shared={shared}
            onShare={() => void shareRoom()}
            onStart={() => void startVoting()}
          />
        ) : stage === 'invite' ? (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <section className="rounded-3xl bg-ns-surface p-7 sm:p-10 lg:p-14">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <RoomContext room={room} />
                <RoomCodeButton room={room} shared={shared} onShare={() => void shareRoom()} />
              </div>
              <h1 className="mt-6 font-display text-5xl text-ns-text sm:text-6xl lg:text-7xl">Pick together.</h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-ns-muted">
                Join the lobby now. Once everyone is in, the host will start {room.candidates.length} private, spoiler-free picks for the whole group.
              </p>

              <div className="mt-8 max-w-sm space-y-3">
                <Input
                  id="movie-night-display-name"
                  label="Your name"
                  value={displayName}
                  maxLength={40}
                  autoFocus
                  error={error || undefined}
                  onChange={event => setDisplayName(event.target.value)}
                  onKeyDown={event => { if (event.key === 'Enter') void joinRoom() }}
                  placeholder="How friends will see you"
                />
                <Button onClick={joinRoom} loading={joining} className="w-full" size="lg">
                  Join the lobby
                  <ArrowRightIcon size={17} />
                </Button>
              </div>

              <p className="mt-5 flex items-center gap-2 text-sm text-ns-muted">
                <LockIcon size={14} className="flex-shrink-0 text-ns-secondary-readable" />
                No account required. Your ballot is private.
              </p>
            </section>

            <ParticipantPanel room={room} />
          </div>
        ) : stage === 'locked' ? (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <section className="flex min-h-[26rem] flex-col justify-center rounded-3xl bg-ns-surface p-7 sm:p-10 lg:p-14">
              <div><Badge variant="warning" size="md">Roster locked</Badge></div>
              <h1 className="mt-4 font-display text-4xl text-ns-text sm:text-5xl">Voting is already underway</h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-ns-muted">
                This room stopped accepting new voters when the host started the ballot. Ask the host to create a new room if you were missed.
              </p>
              <div className="mt-7">
                <Button href="/movie-night" variant="primary" size="lg">Create or join another room</Button>
              </div>
            </section>
            <ParticipantPanel room={room} />
          </div>
        ) : (
          <VotingBooth
            room={room}
            voting={voting}
            shared={shared}
            onVote={(candidateId, value) => void castVote(candidateId, value)}
            onShare={() => void shareRoom()}
          />
        )}
      </div>
    </div>
  )
}

function ParticipantPanel({ room }: { room: MovieNightLiveState }) {
  const inLobby = room.status === 'lobby'

  return (
    <aside aria-labelledby="movie-night-roster-title" className="rounded-2xl bg-ns-surface p-6 lg:sticky lg:top-24">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="movie-night-roster-title" className="font-heading text-xl font-bold text-ns-text">In the room</h2>
        <span className="text-base font-semibold tabular-nums text-ns-muted">
          <span key={room.participantCount} className="inline-block animate-fade-up text-ns-text motion-reduce:animate-none">{room.participantCount}</span>/{ROOM_CAPACITY}
        </span>
      </div>

      <div aria-hidden="true" className="mt-3 flex gap-1">
        {Array.from({ length: ROOM_CAPACITY }, (_, seat) => (
          <span key={seat} className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ns-surface-3">
            <span
              className={`block h-full rounded-full bg-ns-accent ${styles.meter}`}
              style={{ transform: `scaleX(${seat < room.participantCount ? 1 : 0})` }}
            />
          </span>
        ))}
      </div>

      <ul className="mt-3 divide-y divide-ns-border">
        {room.participants.map((participant, index) => {
          const progress = room.candidates.length
            ? Math.min(1, participant.voteCount / room.candidates.length)
            : 0
          return (
            <li key={participant.id} style={stagger(index)} className={`py-3 ${styles.arrive}`}>
              <div className="flex items-center gap-3">
                <Avatar src={participant.avatarUrl} username={participant.displayName} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-base font-semibold text-ns-text">{participant.displayName}</p>
                    {participant.isHost && <Badge variant="secondary">Host</Badge>}
                  </div>
                  <p className="text-sm text-ns-muted">
                    {inLobby ? 'Ready in lobby' : participant.finished ? 'Ballot complete' : `${participant.voteCount} of ${room.candidates.length}`}
                  </p>
                </div>
                {(inLobby || participant.finished) && <CheckIcon size={17} className="flex-shrink-0 text-ns-success" />}
              </div>
              {!inLobby && (
                <div aria-hidden="true" className="mt-2.5 h-1 overflow-hidden rounded-full bg-ns-surface-3">
                  <div className={`h-full rounded-full bg-ns-secondary ${styles.meter}`} style={{ transform: `scaleX(${progress})` }} />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <p className="mt-3 flex items-start gap-2 border-t border-ns-border pt-4 text-sm leading-relaxed text-ns-muted">
        <LockIcon size={14} className="mt-0.5 flex-shrink-0 text-ns-secondary-readable" />
        {inLobby
          ? 'The roster locks when the host starts voting.'
          : 'Ballot choices stay hidden, even from the host.'}
      </p>
    </aside>
  )
}
