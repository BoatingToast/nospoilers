'use client'

import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Input from '@/components/ui/Input'
import PageHeader from '@/components/ui/PageHeader'
import MovieNightIcebreaker from './MovieNightIcebreaker'
import { formatYear, tmdbImageUrl } from '@/lib/utils'
import {
  CheckIcon,
  ChevronIcon,
  ClapperboardIcon,
  CloseIcon,
  FilmIcon,
  FilterIcon,
  FriendsIcon,
  RecsIcon,
  ShareIcon,
  SpoilerZoneIcon,
  WatchlistIcon,
} from '@/components/icons'
import type { MovieNightCandidate, MovieNightSeed, MovieNightSupport } from '@/types'
import styles from './movie-night.module.css'

const GENRE_NAMES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
}

const MOODS = [
  { key: 'crowd', label: 'Crowd pleaser', genreIds: [35, 12, 16, 10751, 28] },
  { key: 'tense', label: 'Tense', genreIds: [53, 27, 9648, 80, 28] },
  { key: 'chill', label: 'Chill', genreIds: [35, 16, 10749, 10402, 99] },
  { key: 'deep', label: 'Deep cut', genreIds: [18, 878, 9648, 36, 99] },
  { key: 'wildcard', label: 'Wildcard', genreIds: [] },
] as const

const VETO_GENRES = [27, 10749, 99, 16, 28, 53, 35, 18, 878, 80]
const RUNTIME_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: '110', label: '< 110m' },
  { value: '130', label: '< 130m' },
  { value: '160', label: '< 160m' },
] as const

type MoodKey = typeof MOODS[number]['key']
type RuntimeValue = typeof RUNTIME_OPTIONS[number]['value']

type ScoredCandidate = MovieNightCandidate & {
  displayScore: number
  selectedSupporters: MovieNightSupport[]
  selectedSeenBy: MovieNightCandidate['seenBy']
  groupReason: string
}

function supportIcon(type: MovieNightSupport['type']) {
  if (type === 'watchlist') return WatchlistIcon
  if (type === 'recommendation') return RecsIcon
  if (type === 'top_five') return ClapperboardIcon
  return CheckIcon
}

function genreLabels(genreIds: number[]) {
  return genreIds
    .map(id => GENRE_NAMES[id])
    .filter((name): name is string => Boolean(name))
    .slice(0, 4)
}

function moodBonus(candidate: MovieNightCandidate, mood: MoodKey) {
  if (mood === 'wildcard') {
    const supporterTypes = new Set(candidate.supporters.map(s => s.type)).size
    const seenPenalty = candidate.seenBy.length > 0 ? -3 : 4
    return supporterTypes * 2 + seenPenalty
  }

  const config = MOODS.find(m => m.key === mood)
  if (!config) return 0

  const matches = candidate.genreIds.filter(id => config.genreIds.includes(id as never)).length
  return Math.min(12, matches * 5)
}

function buildReason(candidate: MovieNightCandidate, supporters: MovieNightSupport[], moodLabel: string) {
  const names = [...new Set(supporters.map(s => s.username))].slice(0, 3)
  const lead = supporters[0]
  const people =
    names.length === 0 ? 'the group' :
    names.length === 1 ? names[0] :
    `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

  if (!lead) return `Fits the ${moodLabel.toLowerCase()} brief.`
  return `${people} give this pick momentum. ${lead.note}.`
}

function scoreCandidate(
  candidate: MovieNightCandidate,
  selectedIds: Set<string>,
  selectedCount: number,
  mood: MoodKey,
): ScoredCandidate | null {
  const selectedSupporters = candidate.supporters.filter(s => selectedIds.has(s.userId))
  if (selectedSupporters.length === 0) return null

  const selectedSeenBy = candidate.seenBy.filter(s => selectedIds.has(s.userId))
  const supportTotal = selectedSupporters.reduce((sum, support) => sum + support.score, 0)
  const coverage = new Set(selectedSupporters.map(s => s.userId)).size / Math.max(selectedCount, 1)
  const quality = candidate.voteAverage ? Math.max(0, (candidate.voteAverage - 6) * 4) : 0
  const diversity = new Set(selectedSupporters.map(s => s.type)).size * 2
  const bonus = moodBonus(candidate, mood)
  const displayScore = Math.max(
    1,
    Math.min(99, Math.round(34 + supportTotal / Math.max(selectedCount, 1) + coverage * 18 + quality + diversity + bonus)),
  )
  const moodLabel = MOODS.find(m => m.key === mood)?.label ?? 'Movie Night'

  return {
    ...candidate,
    displayScore,
    selectedSupporters: [...selectedSupporters].sort((a, b) => b.score - a.score),
    selectedSeenBy,
    groupReason: buildReason(candidate, selectedSupporters, moodLabel),
  }
}

const pillClass = (active: boolean) => [
  'min-h-11 rounded-full px-4 text-sm font-semibold transition-colors duration-150',
  active ? 'bg-ns-text text-ns-bg' : 'bg-ns-surface-2 text-ns-muted hover:bg-ns-surface-3 hover:text-ns-text',
].join(' ')

/** Slides rows to their new rank when the group or filters change the order. */
function useFlipList(order: string) {
  const listRef = useRef<HTMLOListElement>(null)
  const positions = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) {
      positions.current = new Map()
      return
    }
    const animate = document.documentElement.dataset.motion === 'on'
    const origin = list.getBoundingClientRect().top
    const next = new Map<string, number>()

    list.querySelectorAll<HTMLElement>('[data-flip-id]').forEach(row => {
      const id = row.dataset.flipId as string
      const top = row.getBoundingClientRect().top - origin
      const previous = positions.current.get(id)
      next.set(id, top)
      if (!animate || positions.current.size === 0) return
      if (previous === undefined) {
        row.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' })
      } else if (Math.abs(previous - top) > 1) {
        row.animate(
          [{ transform: `translateY(${previous - top}px)` }, { transform: 'none' }],
          { duration: 460, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' },
        )
      }
    })
    positions.current = next
  }, [order])

  return listRef
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl text-left"
    >
      <span className="text-sm text-ns-text">{label}</span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors duration-200 ${on ? 'bg-ns-secondary' : 'bg-ns-surface-3'}`}
      >
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-ns-text transition-transform duration-200 ease-[var(--ns-ease-snap)] ${on ? 'translate-x-4' : ''}`} />
      </span>
    </button>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dd className="font-display text-3xl tabular-nums text-ns-text">
        <span key={value} className="inline-block animate-fade-up motion-reduce:animate-none">{value}</span>
      </dd>
      <dt className="text-sm text-ns-muted">{label}</dt>
    </div>
  )
}

function FitMeter({ value, index = 0 }: { value: number; index?: number }) {
  const tone = value >= 85 ? 'text-ns-success' : value >= 72 ? 'text-ns-secondary-readable' : 'text-ns-muted'

  return (
    <div>
      <p className={`text-sm font-semibold tabular-nums ${tone}`}>
        <span key={value} className="inline-block animate-fade-up motion-reduce:animate-none">{value}%</span> group fit
      </p>
      <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ns-surface-3">
        <div
          className={`h-full rounded-full bg-ns-secondary ${styles.meter} ${styles.barGrow}`}
          style={{ '--i': Math.min(index, 7), transform: `scaleX(${value / 100})` } as CSSProperties}
        />
      </div>
    </div>
  )
}

function NoPicks({ hasFriends }: { hasFriends: boolean }) {
  return (
    <EmptyState
      className="rounded-3xl"
      title="No group picks yet"
      description="Add films to watchlists, rate a few movies, or generate recommendations to build a better shared pool."
      action={(
        <div className="flex flex-wrap justify-center gap-3">
          <Button href="/watchlist" variant="outline">
            <WatchlistIcon size={15} />
            Watchlist
          </Button>
          {!hasFriends && (
            <Button href="/friends/find" variant="outline">
              <FriendsIcon size={15} />
              Find friends
            </Button>
          )}
        </div>
      )}
    />
  )
}

function PickRow({ pick, rank }: { pick: ScoredCandidate; rank: number }) {
  const labels = genreLabels(pick.genreIds)

  return (
    <article data-flip-id={pick.tmdbId} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 py-5 sm:grid-cols-[5.5rem_minmax(0,1fr)_11rem] sm:gap-6">
      <Link
        href={`/movie/${pick.tmdbId}`}
        aria-label={`Open ${pick.title}`}
        className="group relative block aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface-2"
      >
        <Image
          src={tmdbImageUrl(pick.posterPath, 'w185')}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="88px"
        />
      </Link>

      <div className="min-w-0">
        <div className="flex items-start gap-2">
          <span className="font-display text-lg leading-tight tabular-nums text-ns-subtle">{rank}</span>
          <Link href={`/movie/${pick.tmdbId}`} className="group -my-2.5 block min-w-0 py-2.5">
            <h3 className="line-clamp-2 font-heading text-lg font-bold leading-tight text-ns-text transition-colors group-hover:text-ns-secondary-readable">
              {pick.title}
            </h3>
          </Link>
        </div>

        <p className="mt-1 text-sm text-ns-muted">
          {[
            formatYear(pick.releaseDate),
            pick.runtime ? `${pick.runtime} min` : 'Runtime open',
            pick.voteAverage ? `${pick.voteAverage.toFixed(1)} TMDb` : null,
            labels.slice(0, 2).join(', ') || null,
          ].filter(Boolean).join(' · ')}
        </p>

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ns-muted">{pick.groupReason}</p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {pick.selectedSeenBy.length === 0
            ? <Badge variant="success">New to selected group</Badge>
            : <Badge variant="warning">{pick.selectedSeenBy.length} seen</Badge>}
          {pick.selectedSupporters.slice(0, 3).map(support => {
            const Icon = supportIcon(support.type)
            return (
              <span
                key={`${support.userId}-${support.type}`}
                className="inline-flex max-w-[9rem] items-center gap-1 rounded-full bg-ns-surface-2 px-2 py-0.5 text-xs text-ns-muted"
              >
                <Icon size={12} className="flex-shrink-0 text-ns-secondary-readable" />
                <span className="truncate">{support.username}</span>
              </span>
            )
          })}
        </div>
      </div>

      <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-stretch sm:justify-center">
        <div className="min-w-0 flex-1 sm:flex-none"><FitMeter value={pick.displayScore} index={rank - 1} /></div>
        <Button href={`/movie/${pick.tmdbId}#spoiler-zone`} variant="ghost" size="sm" aria-label={`Spoiler zone for ${pick.title}`}>
          <SpoilerZoneIcon size={14} />
          Zone
        </Button>
      </div>
    </article>
  )
}

export default function MovieNightPlanner({ seed }: { seed: MovieNightSeed }) {
  const router = useRouter()
  const [sessionName, setSessionName] = useState('Friday Movie Night')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(seed.participants.slice(0, 5).map(p => p.id)),
  )
  const [mood, setMood] = useState<MoodKey>('crowd')
  const [runtime, setRuntime] = useState<RuntimeValue>('any')
  const [unseenOnly, setUnseenOnly] = useState(true)
  const [avoidDivisive, setAvoidDivisive] = useState(false)
  const [vetoGenres, setVetoGenres] = useState<Set<number>>(() => new Set())
  const [copied, setCopied] = useState(false)
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [liveError, setLiveError] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const selectedCount = selectedIds.size
  const hasFriends = seed.participants.some(p => !p.isViewer)

  const ranked = useMemo(() => {
    const maxRuntime = runtime === 'any' ? null : Number(runtime)

    return seed.candidates
      .map(candidate => scoreCandidate(candidate, selectedIds, selectedCount, mood))
      .filter((candidate): candidate is ScoredCandidate => {
        if (!candidate) return false
        if (unseenOnly && candidate.selectedSeenBy.length > 0) return false
        if (avoidDivisive && (candidate.voteAverage === null || candidate.voteAverage < 6.4)) return false
        if (maxRuntime && (!candidate.runtime || candidate.runtime > maxRuntime)) return false
        if (vetoGenres.size > 0 && candidate.genreIds.length === 0) return false
        if (candidate.genreIds.some(id => vetoGenres.has(id))) return false
        return true
      })
      .sort((a, b) => b.displayScore - a.displayScore)
  }, [avoidDivisive, mood, runtime, seed.candidates, selectedCount, selectedIds, unseenOnly, vetoGenres])

  const topPick = ranked[0]

  function toggleParticipant(id: string) {
    setSelectedIds(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleGenre(id: number) {
    setVetoGenres(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function copyPlan() {
    if (!topPick || typeof navigator === 'undefined' || !navigator.clipboard) return
    const text = `${sessionName}: ${topPick.title} (${topPick.displayScore}% group fit) - ${topPick.groupReason}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  async function startLiveRoom() {
    if (ranked.length < 2 || creatingRoom) {
      setLiveError('Choose filters that leave at least two movie picks.')
      return
    }

    setCreatingRoom(true)
    setLiveError('')
    try {
      const response = await fetch('/api/movie-night/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionName,
          mood,
          maxRuntime: runtime === 'any' ? null : Number(runtime),
          vetoGenres: [...vetoGenres],
          unseenOnly,
          avoidDivisive,
          candidates: ranked.slice(0, 12).map(candidate => ({
            tmdbId:      candidate.tmdbId,
            title:       candidate.title,
            posterPath:  candidate.posterPath,
            releaseDate: candidate.releaseDate,
            genreIds:    candidate.genreIds,
            runtime:     candidate.runtime,
            voteAverage: candidate.voteAverage,
            groupFit:    candidate.displayScore,
            explanation: candidate.groupReason,
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not start the live room')

      window.localStorage.setItem(`nospoilers:movie-night:${data.code}`, data.token)
      router.push(`/movie-night/${data.code}`)
    } catch (cause) {
      setLiveError(cause instanceof Error ? cause.message : 'Could not start the live room')
      setCreatingRoom(false)
    }
  }

  function openRoomByCode() {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) {
      setLiveError('Enter a valid room code.')
      return
    }
    router.push(`/movie-night/${code}`)
  }

  const activeFilters = (runtime !== 'any' ? 1 : 0) + vetoGenres.size + (unseenOnly ? 1 : 0) + (avoidDivisive ? 1 : 0)
  const rankedOrder = ranked.slice(0, 12).map(pick => pick.tmdbId).join(',')
  const rankedListRef = useFlipList(rankedOrder)

  function resetFilters() {
    setRuntime('any')
    setUnseenOnly(false)
    setAvoidDivisive(false)
    setVetoGenres(new Set())
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-16">
      <PageHeader
        title="Movie night picker."
        description="Ranked from watchlists, recommendations, ratings, and Movie DNA across your selected group."
        actions={(
          <dl className="flex gap-8">
            <Stat value={selectedCount} label="Selected" />
            <Stat value={ranked.length} label="Fits" />
            <Stat value={seed.candidates.length} label="Pool" />
          </dl>
        )}
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-3xl bg-ns-tile-rose p-6 sm:p-8 lg:p-10">
          <h2 className="font-display text-3xl text-ns-text sm:text-4xl">Make it a live vote</h2>
          <p className="mt-2 max-w-xl text-lg leading-relaxed text-ns-muted">
            Open a lobby, gather the group, then start one private ballot for everyone at the same time.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={startLiveRoom} loading={creatingRoom} disabled={ranked.length < 2} variant="primary" size="lg">
              <ShareIcon size={17} />
              Open live lobby
            </Button>
            <div className="flex h-14 items-center rounded-full bg-ns-bg p-1 focus-within:ring-1 focus-within:ring-ns-text sm:w-64">
              <input
                value={joinCode}
                onChange={event => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                onKeyDown={event => { if (event.key === 'Enter') openRoomByCode() }}
                placeholder="Room code"
                aria-label="Room code"
                className="h-full min-w-0 flex-1 rounded-full bg-transparent px-4 font-display text-base text-ns-text placeholder:font-body placeholder:text-ns-subtle focus:outline-none"
              />
              <button
                type="button"
                onClick={openRoomByCode}
                className="h-full flex-shrink-0 rounded-full bg-ns-surface-2 px-5 text-sm font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-surface-3"
              >
                Join
              </button>
            </div>
          </div>

          {liveError && (
            <p role="alert" className="mt-4 animate-fade-up text-sm font-semibold text-ns-danger motion-reduce:animate-none">
              {liveError}
            </p>
          )}
        </section>

        <MovieNightIcebreaker
          players={seed.participants
            .filter(participant => selectedIds.has(participant.id))
            .map(participant => ({
              id: participant.id,
              label: participant.isViewer ? 'You' : participant.username,
            }))}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-3xl bg-ns-surface p-6 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
          <div className="space-y-7">
            <Input
              id="movie-night-name"
              label="Session"
              value={sessionName}
              onChange={event => setSessionName(event.target.value)}
            />

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold text-ns-text">Group</h2>
                <Button href="/friends/find" variant="ghost" size="sm">
                  <FriendsIcon size={14} />
                  Add
                </Button>
              </div>

              <div className="-mx-2 space-y-1">
                {seed.participants.map(participant => {
                  const selected = selectedIds.has(participant.id)
                  return (
                    <button
                      key={participant.id}
                      type="button"
                      onClick={() => toggleParticipant(participant.id)}
                      aria-pressed={selected}
                      className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-150 ${selected ? 'bg-ns-surface-2' : 'hover:bg-ns-surface-2'}`}
                    >
                      <Avatar src={participant.avatarUrl} username={participant.username} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ns-text">
                          {participant.isViewer ? 'You' : participant.username}
                        </span>
                        <span className="block truncate text-xs text-ns-muted">
                          {participant.topGenres.length ? participant.topGenres.join(', ') : 'Building taste profile'}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-150 ${selected ? 'bg-ns-secondary text-ns-secondary-foreground' : 'bg-ns-surface-3 text-transparent'}`}
                      >
                        <CheckIcon size={13} />
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <h2 className="mb-3 font-heading text-lg font-bold text-ns-text">Mood</h2>
              <div className="flex flex-wrap gap-2">
                {MOODS.map(option => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setMood(option.key)}
                    aria-pressed={mood === option.key}
                    className={pillClass(mood === option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <button
              type="button"
              onClick={() => setFiltersOpen(open => !open)}
              aria-expanded={filtersOpen}
              aria-controls="movie-night-filters"
              className="flex min-h-12 w-full items-center justify-between rounded-full bg-ns-surface-2 px-5 text-sm font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-surface-3 lg:hidden"
            >
              <span className="flex items-center gap-2">
                <FilterIcon size={16} />
                More filters
                {activeFilters > 0 && <span className="rounded-full bg-ns-accent px-2 text-xs tabular-nums text-ns-secondary-foreground">{activeFilters}</span>}
              </span>
              <ChevronIcon direction="down" size={16} className={`transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>

            <div id="movie-night-filters" className={`space-y-7 ${filtersOpen ? 'animate-fade-up motion-reduce:animate-none' : 'hidden'} lg:block`}>
              <section>
                <h2 className="mb-3 font-heading text-lg font-bold text-ns-text">Runtime</h2>
                <div className="grid grid-cols-4 gap-1 rounded-full bg-ns-surface-2 p-1">
                  {RUNTIME_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRuntime(option.value)}
                      aria-pressed={runtime === option.value}
                      className={`min-h-10 whitespace-nowrap rounded-full px-1 text-xs font-semibold transition-colors duration-150 ${runtime === option.value ? 'bg-ns-text text-ns-bg' : 'text-ns-muted hover:text-ns-text'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-3 font-heading text-lg font-bold text-ns-text">Veto genres</h2>
                <div className="flex flex-wrap gap-2">
                  {VETO_GENRES.map(id => {
                    const active = vetoGenres.has(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleGenre(id)}
                        aria-pressed={active}
                        className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors duration-150 ${active ? 'bg-ns-danger/10 text-ns-danger' : 'bg-ns-surface-2 text-ns-muted hover:bg-ns-surface-3 hover:text-ns-text'}`}
                      >
                        {active && <CloseIcon size={12} />}
                        {GENRE_NAMES[id]}
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="divide-y divide-ns-border">
                <Toggle label="No one selected has seen it" on={unseenOnly} onToggle={() => setUnseenOnly(v => !v)} />
                <Toggle label="Avoid low consensus picks" on={avoidDivisive} onToggle={() => setAvoidDivisive(v => !v)} />
              </section>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          {topPick ? (
            <section className="overflow-hidden rounded-3xl bg-ns-surface">
              <div key={topPick.tmdbId} className={`grid gap-6 p-6 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-8 sm:p-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:p-10 ${styles.cardIn}`}>
                <Link
                  href={`/movie/${topPick.tmdbId}`}
                  aria-label={`Open ${topPick.title}`}
                  className="group relative mx-auto block aspect-[2/3] w-48 overflow-hidden rounded-xl bg-ns-surface-2 shadow-2xl sm:w-full"
                >
                  <Image
                    src={tmdbImageUrl(topPick.posterPath, 'w342')}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 192px, 260px"
                    priority
                  />
                </Link>

                <div className="flex min-w-0 flex-col justify-center">
                  <div><Badge variant="success" size="md">Best fit</Badge></div>
                  <h2 className="mt-3 break-words font-display text-3xl text-ns-text sm:text-5xl">{topPick.title}</h2>
                  <div className="mt-4 max-w-sm"><FitMeter value={topPick.displayScore} /></div>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-ns-muted">{topPick.groupReason}</p>

                  <dl className="mt-5 grid max-w-md grid-cols-4 gap-2">
                    {[
                      ['Year', formatYear(topPick.releaseDate)],
                      ['Minutes', topPick.runtime ? `${topPick.runtime}` : 'Any'],
                      ['Signals', `${topPick.selectedSupporters.length}`],
                      ['Seen', `${topPick.selectedSeenBy.length}`],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dd className="truncate font-display text-xl tabular-nums text-ns-text">{value}</dd>
                        <dt className="text-xs text-ns-muted">{label}</dt>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {genreLabels(topPick.genreIds).map(label => <Badge key={label} variant="muted" size="md">{label}</Badge>)}
                    {genreLabels(topPick.genreIds).length === 0 && <Badge variant="muted" size="md">Genre flexible</Badge>}
                  </div>

                  {topPick.selectedSupporters.length > 0 && (
                    <ul className="mt-5 space-y-2">
                      {topPick.selectedSupporters.slice(0, 5).map(support => {
                        const Icon = supportIcon(support.type)
                        return (
                          <li key={`${support.userId}-${support.type}`} className="flex items-start gap-2 text-sm text-ns-muted">
                            <Icon size={15} className="mt-0.5 flex-shrink-0 text-ns-secondary-readable" />
                            <span className="min-w-0">{support.note}</span>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button href={`/movie/${topPick.tmdbId}`} variant="outline">
                      <FilmIcon size={15} />
                      Open
                    </Button>
                    <Button onClick={copyPlan} variant="ghost">
                      {copied ? <CheckIcon size={15} /> : <ShareIcon size={15} />}
                      {copied ? 'Copied' : 'Share'}
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          ) : seed.candidates.length === 0 ? (
            <NoPicks hasFriends={hasFriends} />
          ) : (
            <EmptyState
              className="rounded-3xl"
              title="No matches under these filters"
              description="Relax the runtime, veto, or unseen filters to reopen the pool."
              action={<Button onClick={resetFilters} variant="outline">Reset filters</Button>}
            />
          )}

          {ranked.length > 0 && (
            <section className="ns-reveal rounded-3xl bg-ns-surface px-5 py-6 sm:px-8 sm:py-8">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-2xl text-ns-text sm:text-3xl">Ranked picks</h2>
                <span className="text-sm tabular-nums text-ns-muted">{ranked.length} movies</span>
              </div>
              <ol ref={rankedListRef} className="mt-2 divide-y divide-ns-border">
                {ranked.slice(0, 12).map((pick, index) => (
                  <li key={pick.tmdbId}>
                    <PickRow pick={pick} rank={index + 1} />
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
