'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import MovieNightIcebreaker from './MovieNightIcebreaker'
import { formatYear, tmdbImageUrl } from '@/lib/utils'
import {
  CheckIcon,
  ClapperboardIcon,
  FilmIcon,
  FriendsIcon,
  RecsIcon,
  ShareIcon,
  SpoilerZoneIcon,
  WatchlistIcon,
} from '@/components/icons'
import type { MovieNightCandidate, MovieNightSeed, MovieNightSupport } from '@/types'

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
  { key: 'crowd', label: 'Crowd Pleaser', genreIds: [35, 12, 16, 10751, 28] },
  { key: 'tense', label: 'Tense', genreIds: [53, 27, 9648, 80, 28] },
  { key: 'chill', label: 'Chill', genreIds: [35, 16, 10749, 10402, 99] },
  { key: 'deep', label: 'Deep Cut', genreIds: [18, 878, 9648, 36, 99] },
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

function EmptyState({ hasFriends }: { hasFriends: boolean }) {
  return (
    <div className="border border-ns-border bg-ns-surface rounded-2xl p-8 text-center">
      <ClapperboardIcon size={34} className="mx-auto text-ns-secondary mb-3" />
      <h2 className="text-lg font-heading text-white mb-2">No group picks yet</h2>
      <p className="text-sm font-body text-ns-muted max-w-md mx-auto leading-relaxed">
        Add films to watchlists, rate a few movies, or generate recommendations to build a better shared pool.
      </p>
      <div className="mt-5 flex justify-center gap-3">
        <Button href="/watchlist" variant="secondary" size="sm">
          <WatchlistIcon size={15} />
          Watchlist
        </Button>
        {!hasFriends && (
          <Button href="/friends/find" variant="primary" size="sm">
            <FriendsIcon size={15} />
            Find Friends
          </Button>
        )}
      </div>
    </div>
  )
}

function PickCard({ pick, rank }: { pick: ScoredCandidate; rank: number }) {
  const scoreTone =
    pick.displayScore >= 85 ? 'text-ns-success' :
    pick.displayScore >= 72 ? 'text-ns-secondary' :
    'text-ns-muted'
  const labels = genreLabels(pick.genreIds)

  return (
    <article className="bg-ns-surface border border-ns-border rounded-2xl overflow-hidden">
      <div className="flex gap-4 p-4">
        <Link
          href={`/movie/${pick.tmdbId}`}
          className="relative w-[82px] h-[123px] sm:w-[104px] sm:h-[156px] rounded-xl overflow-hidden bg-ns-border flex-shrink-0"
        >
          <Image
            src={tmdbImageUrl(pick.posterPath, 'w185')}
            alt={pick.title}
            fill
            className="object-cover"
            sizes="104px"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="secondary">#{rank}</Badge>
            <span className={`text-xs font-body font-semibold ${scoreTone}`}>{pick.displayScore}% Group Fit</span>
            {pick.selectedSeenBy.length === 0 ? (
              <Badge variant="success">New to selected group</Badge>
            ) : (
              <Badge variant="warning">{pick.selectedSeenBy.length} seen</Badge>
            )}
          </div>

          <Link href={`/movie/${pick.tmdbId}`} className="group">
            <h3 className="text-base sm:text-lg font-heading text-white leading-tight group-hover:text-ns-secondary transition-colors line-clamp-2">
              {pick.title}
            </h3>
          </Link>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs font-body text-ns-muted">
            <span>{formatYear(pick.releaseDate)}</span>
            <span>{pick.runtime ? `${pick.runtime} min` : 'Runtime open'}</span>
            {pick.voteAverage && <span>{pick.voteAverage.toFixed(1)} TMDb</span>}
          </div>

          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {labels.map(label => <Badge key={label} variant="outline">{label}</Badge>)}
            </div>
          )}

          <p className="text-sm font-body text-ns-muted leading-relaxed mt-3 line-clamp-2">
            {pick.groupReason}
          </p>
        </div>
      </div>

      <div className="border-t border-ns-border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {pick.selectedSupporters.slice(0, 3).map(support => {
            const Icon = supportIcon(support.type)
            return (
              <span
                key={`${support.userId}-${support.type}`}
                className="inline-flex items-center gap-1.5 text-[11px] font-body text-ns-muted bg-ns-surface-2 border border-ns-border rounded-full px-2 py-1"
              >
                <Icon size={12} className="text-ns-secondary" />
                {support.username}
              </span>
            )
          })}
        </div>

        <div className="flex gap-2">
          <Button href={`/movie/${pick.tmdbId}`} variant="secondary" size="sm">
            <FilmIcon size={14} />
            Movie
          </Button>
          <Button href={`/movie/${pick.tmdbId}#spoiler-zone`} variant="outline" size="sm">
            <SpoilerZoneIcon size={14} />
            Zone
          </Button>
        </div>
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ClapperboardIcon size={22} className="text-ns-secondary" />
            <Badge variant="secondary" className="uppercase tracking-wider">Group Picker</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading text-white">Movie Night Picker</h1>
          <p className="text-sm font-body text-ns-muted mt-2 max-w-2xl leading-relaxed">
            Ranked from watchlists, recommendations, ratings, and Movie DNA across your selected group.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 min-w-full sm:min-w-[360px] lg:min-w-[420px]">
          <div className="bg-ns-surface border border-ns-border rounded-2xl px-4 py-3">
            <p className="font-display text-2xl text-white">{selectedCount}</p>
            <p className="text-[11px] font-body text-ns-muted">Selected</p>
          </div>
          <div className="bg-ns-surface border border-ns-border rounded-2xl px-4 py-3">
            <p className="font-display text-2xl text-white">{ranked.length}</p>
            <p className="text-[11px] font-body text-ns-muted">Fits</p>
          </div>
          <div className="bg-ns-surface border border-ns-border rounded-2xl px-4 py-3">
            <p className="font-display text-2xl text-white">{seed.candidates.length}</p>
            <p className="text-[11px] font-body text-ns-muted">Pool</p>
          </div>
        </div>
      </div>

      <MovieNightIcebreaker
        players={seed.participants
          .filter(participant => selectedIds.has(participant.id))
          .map(participant => ({
            id: participant.id,
            label: participant.isViewer ? 'You' : participant.username,
          }))}
      />

      <section className="relative overflow-hidden rounded-3xl border border-ns-secondary/30 bg-ns-surface mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-ns-secondary/12 via-transparent to-ns-success/5 pointer-events-none" />
        <div className="relative p-5 sm:p-7 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-ns-secondary/10 border border-ns-secondary/30 flex items-center justify-center flex-shrink-0">
              <FriendsIcon size={23} className="text-ns-secondary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h2 className="text-lg font-heading text-white">Make it a live vote</h2>
                <Badge variant="success">New</Badge>
              </div>
              <p className="text-sm font-body text-ns-muted leading-relaxed max-w-xl">
                Open a lobby, gather the group, then start one private ballot for everyone at the same time.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 xl:flex-shrink-0">
            <div className="flex rounded-xl border border-ns-border bg-ns-surface-2 overflow-hidden focus-within:border-ns-secondary/50">
              <input
                value={joinCode}
                onChange={event => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                onKeyDown={event => { if (event.key === 'Enter') openRoomByCode() }}
                placeholder="ROOM CODE"
                aria-label="Room code"
                className="w-32 bg-transparent px-3 py-2.5 text-sm font-display tracking-widest text-white placeholder:text-ns-muted/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={openRoomByCode}
                className="px-3 text-xs font-body text-ns-muted border-l border-ns-border hover:text-white hover:bg-white/5 transition-colors"
              >
                Join
              </button>
            </div>
            <Button onClick={startLiveRoom} loading={creatingRoom} disabled={ranked.length < 2} variant="primary">
              <ShareIcon size={16} />
              Open live lobby
            </Button>
          </div>
        </div>
        {liveError && (
          <div className="relative border-t border-ns-danger/20 bg-ns-danger/5 px-5 sm:px-7 py-2.5 text-xs font-body text-ns-danger">
            {liveError}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6 items-start">
        <aside className="bg-ns-surface border border-ns-border rounded-2xl p-5 lg:sticky lg:top-24">
          <div className="space-y-6">
            <Input
              id="movie-night-name"
              label="Session"
              value={sessionName}
              onChange={event => setSessionName(event.target.value)}
            />

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-heading text-white">Group</h2>
                <Button href="/friends/find" variant="ghost" size="sm">
                  <FriendsIcon size={14} />
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {seed.participants.map(participant => {
                  const selected = selectedIds.has(participant.id)
                  return (
                    <button
                      key={participant.id}
                      type="button"
                      onClick={() => toggleParticipant(participant.id)}
                      aria-pressed={selected}
                      className={[
                        'w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                        selected
                          ? 'border-ns-secondary/45 bg-ns-secondary/10'
                          : 'border-ns-border bg-ns-surface-2 hover:border-ns-secondary/30',
                      ].join(' ')}
                    >
                      <Avatar src={participant.avatarUrl} username={participant.username} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-body text-white truncate">
                          {participant.isViewer ? 'You' : participant.username}
                        </span>
                        <span className="block text-[11px] font-body text-ns-muted truncate">
                          {participant.topGenres.length ? participant.topGenres.join(', ') : 'Building taste profile'}
                        </span>
                      </span>
                      <span className={[
                        'w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0',
                        selected ? 'border-ns-secondary bg-ns-secondary text-ns-secondary-foreground' : 'border-ns-border',
                      ].join(' ')}>
                        {selected && <CheckIcon size={13} />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-heading text-white mb-3">Mood</h2>
              <div className="grid grid-cols-2 gap-2">
                {MOODS.map(option => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setMood(option.key)}
                    aria-pressed={mood === option.key}
                    className={[
                      'rounded-xl border px-3 py-2 text-xs font-body transition-colors',
                      mood === option.key
                        ? 'border-ns-secondary/45 bg-ns-secondary/10 text-ns-secondary'
                        : 'border-ns-border bg-ns-surface-2 text-ns-muted hover:text-white',
                    ].join(' ')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-heading text-white mb-3">Runtime</h2>
              <div className="grid grid-cols-4 gap-2">
                {RUNTIME_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRuntime(option.value)}
                    aria-pressed={runtime === option.value}
                    className={[
                      'rounded-lg border px-2 py-2 text-xs font-body transition-colors',
                      runtime === option.value
                        ? 'border-ns-secondary/45 bg-ns-secondary/10 text-ns-secondary'
                        : 'border-ns-border bg-ns-surface-2 text-ns-muted hover:text-white',
                    ].join(' ')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-heading text-white mb-3">Veto Genres</h2>
              <div className="flex flex-wrap gap-2">
                {VETO_GENRES.map(id => {
                  const active = vetoGenres.has(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleGenre(id)}
                      aria-pressed={active}
                      className={[
                        'rounded-full border px-3 py-1.5 text-[11px] font-body transition-colors',
                        active
                          ? 'border-ns-danger/40 bg-ns-danger/10 text-ns-danger'
                          : 'border-ns-border bg-ns-surface-2 text-ns-muted hover:text-white',
                      ].join(' ')}
                    >
                      {GENRE_NAMES[id]}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-2">
              <button
                type="button"
                onClick={() => setUnseenOnly(v => !v)}
                aria-pressed={unseenOnly}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-ns-border bg-ns-surface-2 px-3 py-2.5"
              >
                <span className="text-sm font-body text-white">No one selected has seen it</span>
                <span className={[
                  'w-9 h-5 rounded-full border transition-colors relative',
                  unseenOnly ? 'bg-ns-secondary/30 border-ns-secondary/50' : 'bg-ns-border/40 border-ns-border',
                ].join(' ')}>
                  <span className={[
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                    unseenOnly ? 'translate-x-4' : 'translate-x-0.5',
                  ].join(' ')} />
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAvoidDivisive(v => !v)}
                aria-pressed={avoidDivisive}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-ns-border bg-ns-surface-2 px-3 py-2.5"
              >
                <span className="text-sm font-body text-white">Avoid low consensus picks</span>
                <span className={[
                  'w-9 h-5 rounded-full border transition-colors relative',
                  avoidDivisive ? 'bg-ns-secondary/30 border-ns-secondary/50' : 'bg-ns-border/40 border-ns-border',
                ].join(' ')}>
                  <span className={[
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                    avoidDivisive ? 'translate-x-4' : 'translate-x-0.5',
                  ].join(' ')} />
                </span>
              </button>
            </section>
          </div>
        </aside>

        <main className="space-y-6 min-w-0">
          {topPick ? (
            <section className="bg-ns-surface border border-ns-border rounded-2xl overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-ns-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="success">Best Fit</Badge>
                    <span className="text-xs font-body text-ns-muted">{topPick.displayScore}% group fit</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-heading text-white leading-tight">{topPick.title}</h2>
                  <p className="text-sm font-body text-ns-muted mt-1">{topPick.groupReason}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={copyPlan} variant="secondary" size="sm">
                    {copied ? <CheckIcon size={15} /> : <ShareIcon size={15} />}
                    {copied ? 'Copied' : 'Share'}
                  </Button>
                  <Button href={`/movie/${topPick.tmdbId}`} variant="primary" size="sm">
                    <FilmIcon size={15} />
                    Open
                  </Button>
                </div>
              </div>

              <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-5">
                <Link
                  href={`/movie/${topPick.tmdbId}`}
                  className="relative w-full max-w-[180px] mx-auto md:mx-0 aspect-[2/3] rounded-2xl overflow-hidden bg-ns-border"
                >
                  <Image
                    src={tmdbImageUrl(topPick.posterPath, 'w342')}
                    alt={topPick.title}
                    fill
                    className="object-cover"
                    sizes="180px"
                    priority
                  />
                </Link>
                <div className="space-y-4 min-w-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-ns-surface-2 border border-ns-border px-3 py-2">
                      <p className="text-lg font-display text-white">{formatYear(topPick.releaseDate)}</p>
                      <p className="text-[11px] font-body text-ns-muted">Year</p>
                    </div>
                    <div className="rounded-xl bg-ns-surface-2 border border-ns-border px-3 py-2">
                      <p className="text-lg font-display text-white">{topPick.runtime ? `${topPick.runtime}` : 'Any'}</p>
                      <p className="text-[11px] font-body text-ns-muted">Minutes</p>
                    </div>
                    <div className="rounded-xl bg-ns-surface-2 border border-ns-border px-3 py-2">
                      <p className="text-lg font-display text-white">{topPick.selectedSupporters.length}</p>
                      <p className="text-[11px] font-body text-ns-muted">Signals</p>
                    </div>
                    <div className="rounded-xl bg-ns-surface-2 border border-ns-border px-3 py-2">
                      <p className="text-lg font-display text-white">{topPick.selectedSeenBy.length}</p>
                      <p className="text-[11px] font-body text-ns-muted">Seen</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {genreLabels(topPick.genreIds).map(label => <Badge key={label} variant="outline" size="md">{label}</Badge>)}
                    {genreLabels(topPick.genreIds).length === 0 && <Badge variant="muted" size="md">Genre flexible</Badge>}
                  </div>

                  <div className="space-y-2">
                    {topPick.selectedSupporters.slice(0, 5).map(support => {
                      const Icon = supportIcon(support.type)
                      return (
                        <div key={`${support.userId}-${support.type}`} className="flex items-start gap-2 text-sm font-body text-ns-muted">
                          <Icon size={15} className="text-ns-secondary mt-0.5 flex-shrink-0" />
                          <span>{support.note}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>
          ) : seed.candidates.length === 0 ? (
            <EmptyState hasFriends={hasFriends} />
          ) : (
            <div className="border border-ns-border bg-ns-surface rounded-2xl p-8 text-center">
              <RecsIcon size={32} className="mx-auto text-ns-secondary mb-3" />
              <h2 className="text-lg font-heading text-white mb-2">No matches under these filters</h2>
              <p className="text-sm font-body text-ns-muted">Relax the runtime, veto, or unseen filters to reopen the pool.</p>
            </div>
          )}

          {ranked.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-heading text-white">Ranked Picks</h2>
                <span className="text-xs font-body text-ns-muted">{ranked.length} movies</span>
              </div>
              <div className="space-y-3">
                {ranked.slice(0, 12).map((pick, index) => (
                  <PickCard key={pick.tmdbId} pick={pick} rank={index + 1} />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
