'use client'

import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import Link from 'next/link'
import PosterFill from '@/components/watchlist/PosterFill'
import Button from '@/components/ui/Button'
import { ChevronIcon, ShareIcon } from '@/components/icons'
import { Meter } from '@/components/watchlist/LibraryControls'
import { cn } from '@/lib/utils'
import type { WrappedData } from '@/types'

interface Props {
  data:     WrappedData
  username: string
  year:     number
}

interface SlideData {
  key:      string
  name:     string
  tile:     string
  backdrop?: string | null
  content:  ReactNode
}

// Each slide plays its own short sequence, so reveals start right after the slide changes.
const rise = (index: number): CSSProperties => ({ animationDelay: `${index * 110}ms` })

/** Counts up to the value once. Reduced motion and screen readers get the final number. */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.dataset.motion === 'on' ? 0 : value)

  useEffect(() => {
    if (document.documentElement.dataset.motion !== 'on') {
      setShown(value)
      return
    }
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 1200)
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 4))))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return (
    <>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{value}</span>
    </>
  )
}

function SlideLabel({ children }: { children: ReactNode }) {
  return <h2 className="ns-rise font-heading text-xl font-semibold text-ns-text sm:text-2xl" style={rise(0)}>{children}</h2>
}

function HugeNumber({ value, unit }: { value: number; unit: string }) {
  return (
    <p className="ns-rise mt-4" style={rise(1)}>
      <span className="block font-display text-[clamp(7rem,32vw,17rem)] leading-[0.9] tabular-nums text-ns-text">
        {value > 0 ? <CountUp value={value} /> : '?'}
      </span>
      <span className="mt-3 block font-heading text-2xl font-semibold text-ns-text">{unit}</span>
    </p>
  )
}

function buildSlides(data: WrappedData, username: string, year: number): SlideData[] {
  const slides: SlideData[] = []

  slides.push({
    key: 'intro',
    name: 'Intro',
    tile: 'bg-ns-bg',
    content: (
      <div className="text-center">
        <p className="font-display text-[clamp(6.5rem,30vw,17rem)] leading-[0.9] tabular-nums text-ns-text">
          <span className="ns-word" style={rise(0)}>{year}</span>
        </p>
        <p className="mt-3 font-display text-5xl sm:text-7xl">
          <span className="ns-word" style={rise(2)}>
            <span className="ns-unredact" style={{ animationDelay: '620ms' }}>Wrapped</span>
          </span>
        </p>
        <p className="ns-rise mt-6 break-words text-lg text-ns-muted" style={rise(4)}>Your year in film, @{username}</p>
      </div>
    ),
  })

  slides.push({
    key: 'watched',
    name: 'Films watched',
    tile: 'bg-ns-tile-green',
    content: (
      <div className="text-center">
        <SlideLabel>This year you watched</SlideLabel>
        <HugeNumber value={data.moviesWatched} unit="Films" />
        {data.moviesWatched === 0 && (
          <p className="ns-rise mx-auto mt-5 max-w-xs text-base leading-relaxed text-ns-muted" style={rise(2)}>
            Start adding movies to your watchlist and marking them as watched to track your journey!
          </p>
        )}
        {data.totalWatchTime && data.totalWatchTime > 0 ? (
          <p className="ns-rise mt-6 text-lg text-ns-muted" style={rise(3)}>
            That&apos;s <span className="font-semibold tabular-nums text-ns-text">{Math.round(data.totalWatchTime / 60)}h</span> of cinema
          </p>
        ) : null}
      </div>
    ),
  })

  if (data.topGenres.length > 0) {
    slides.push({
      key: 'genres',
      name: 'Top genres',
      tile: 'bg-ns-tile-blue',
      content: (
        <div className="w-full max-w-xl">
          <div className="text-center"><SlideLabel>Your favorite genres</SlideLabel></div>
          <ol className="mt-8 flex flex-col gap-3">
            {data.topGenres.map((genre, index) => (
              <li key={genre} className="ns-rise relative overflow-hidden rounded-2xl bg-ns-bg/50" style={rise(index + 1)}>
                <Meter
                  value={(3 - index) / 3}
                  className="absolute inset-0 !h-full !rounded-2xl !bg-transparent"
                  fillClassName="!rounded-2xl bg-ns-text/15"
                  fillStyle={{ transitionDelay: `${240 + index * 140}ms` }}
                />
                <span className="relative flex min-h-16 items-center justify-between gap-4 px-5 sm:min-h-20 sm:px-7">
                  <span className="min-w-0 truncate font-heading text-xl font-bold text-ns-text sm:text-3xl">{genre}</span>
                  <span className="font-display text-2xl tabular-nums text-ns-text sm:text-4xl">{index + 1}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      ),
    })
  }

  if (data.topMovies.length > 0) {
    const [first, ...others] = data.topMovies.slice(0, 5)
    slides.push({
      key: 'films',
      name: 'Top films',
      tile: 'bg-ns-bg',
      backdrop: first.posterPath,
      content: (
        <div className="w-full max-w-3xl text-center">
          <SlideLabel>{data.moviesWatched > 0 ? 'Your top films this year' : 'Your all-time favorites'}</SlideLabel>
          <div className="mt-6 flex flex-col items-center gap-5 md:flex-row md:items-end md:justify-center">
            <Link href={`/movie/${first.tmdbId}`} className="ns-rise group block w-40 flex-shrink-0 sm:w-52" style={rise(1)}>
              <span className="relative block aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface shadow-2xl">
                <PosterFill
                  path={first.posterPath}
                  size="w500"
                  className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                  sizes="208px"
                />
                <span className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ns-accent font-heading text-base font-bold text-ns-secondary-foreground">1</span>
              </span>
              <span className="mt-2 block truncate font-heading text-lg font-bold text-ns-text">{first.title}</span>
            </Link>
            {others.length > 0 && (
              <ol className="flex w-full max-w-md justify-center gap-2 sm:gap-3" start={2}>
                {others.map((movie, index) => (
                  <li key={movie.tmdbId} className="ns-rise min-w-0 flex-1" style={rise(index + 2)}>
                    <Link href={`/movie/${movie.tmdbId}`} className="group block">
                      <span className="relative block aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface shadow-2xl">
                        <PosterFill
                          path={movie.posterPath}
                          size="w185"
                          className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                          sizes="96px"
                        />
                        <span className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-xs font-bold text-white">{index + 2}</span>
                      </span>
                      <span className="mt-1.5 block truncate text-xs font-semibold text-ns-text">{movie.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      ),
    })
  }

  if (data.topTrait) {
    slides.push({
      key: 'trait',
      name: 'Defining trait',
      tile: 'bg-ns-tile-rose',
      content: (
        <div className="max-w-3xl text-center">
          <SlideLabel>Your defining trait</SlideLabel>
          <p className="mt-6 break-words font-display text-6xl sm:text-8xl">
            <span className="ns-unredact" style={{ animationDelay: '380ms' }}>{data.topTrait}</span>
          </p>
          <p className="ns-rise mx-auto mt-6 max-w-md text-lg leading-relaxed text-ns-muted" style={rise(3)}>
            This dimension dominates your Movie DNA — it defines what you look for in every film.
          </p>
        </div>
      ),
    })
  }

  if (data.personalityType) {
    slides.push({
      key: 'personality',
      name: 'Movie personality',
      tile: 'bg-ns-tile-lilac',
      content: (
        <div className="max-w-3xl text-center">
          <SlideLabel>You are</SlideLabel>
          <p className="mt-6 break-words font-display text-6xl leading-[0.95] sm:text-8xl">
            <span className="ns-unredact" style={{ animationDelay: '380ms' }}>{data.personalityType}</span>
          </p>
          <p className="ns-rise mt-6 text-lg text-ns-muted" style={rise(3)}>Your Movie Personality for {year}</p>
        </div>
      ),
    })
  }

  slides.push({
    key: 'achievements',
    name: 'Achievements',
    tile: 'bg-ns-tile-yellow',
    content: (
      <div className="text-center">
        <SlideLabel>Achievements unlocked</SlideLabel>
        <p className="ns-rise mt-4" style={rise(1)}>
          <span className="block font-display text-[clamp(7rem,32vw,17rem)] leading-[0.9] tabular-nums text-ns-text">
            <CountUp value={data.achievementsEarned} />
          </span>
          <span className="mt-3 block font-heading text-2xl font-semibold text-ns-text">Badges earned</span>
        </p>
        <p className="ns-rise mx-auto mt-5 max-w-xs text-base leading-relaxed text-ns-muted" style={rise(2)}>
          {data.achievementsEarned > 0
            ? 'Keep watching to unlock more!'
            : 'Start watching movies to earn your first achievement badges.'}
        </p>
      </div>
    ),
  })

  slides.push({
    key: 'finale',
    name: 'Your year',
    tile: 'bg-ns-bg',
    backdrop: data.topMovies[0]?.posterPath,
    content: (
      <div className="w-full max-w-md text-center">
        <SlideLabel>NoSpoilers · {year} Wrapped</SlideLabel>
        <div className="ns-rise mt-6 rounded-3xl bg-ns-surface p-7 shadow-2xl sm:p-9" style={rise(1)}>
          <p className="break-words font-display text-4xl text-ns-text">@{username}</p>
          <dl className="mt-6 flex justify-center gap-8">
            <div className="flex flex-col-reverse">
              <dt className="mt-1 text-sm text-ns-muted">Films</dt>
              <dd className="font-display text-4xl tabular-nums text-ns-text">{data.moviesWatched}</dd>
            </div>
            <div className="flex flex-col-reverse">
              <dt className="mt-1 text-sm text-ns-muted">Badges</dt>
              <dd className="font-display text-4xl tabular-nums text-ns-text">{data.achievementsEarned}</dd>
            </div>
            {data.personalityType && (
              <div className="flex min-w-0 flex-col-reverse">
                <dt className="mt-1 text-sm text-ns-muted">Personality</dt>
                <dd className="truncate font-display text-2xl leading-10 text-ns-secondary-readable">
                  {data.personalityType.split(' ').pop()}
                </dd>
              </div>
            )}
          </dl>
          {data.topGenres[0] && (
            <p className="mt-5 border-t border-ns-border pt-4 text-sm text-ns-muted">
              Top genre: <span className="font-semibold text-ns-text">{data.topGenres[0]}</span>
            </p>
          )}
        </div>
        <p className="ns-rise mt-5 text-sm text-ns-muted" style={rise(2)}>nospoilers.app · Your cinematic journey</p>
      </div>
    ),
  })

  return slides
}

export default function WrappedExperience({ data, username, year }: Props) {
  const [current, setCurrent] = useState(0)
  const [copied,  setCopied]  = useState(false)

  const slides = buildSlides(data, username, year)
  const total  = slides.length
  const slide  = slides[current]

  function next() { setCurrent(c => Math.min(c + 1, total - 1)) }
  function prev() { setCurrent(c => Math.max(c - 1, 0)) }

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setCurrent(c => Math.min(c + 1, total - 1))
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   setCurrent(c => Math.max(c - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total])

  async function share() {
    const url = `${window.location.origin}/profile/${username}`
    if (navigator.share) {
      await navigator.share({ title: `${username}'s ${year} Movie Wrapped`, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Tapping the stage moves through the story, like flipping through cards.
  function handleStageClick(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('a, button')) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (event.clientX - bounds.left < bounds.width * 0.3) prev()
    else next()
  }

  const backdrops = Array.from(new Set(slides.flatMap(item => item.backdrop ? [item.backdrop] : [])))
  const tiles = Array.from(new Set(slides.map(item => item.tile)))

  return (
    <div className="fixed inset-0 z-[65] flex flex-col overflow-hidden bg-ns-bg">
      <div aria-hidden="true" className="absolute inset-0">
        {tiles.map(tile => (
          <div
            key={tile}
            className={cn('absolute inset-0 transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]', tile, slide.tile === tile ? 'opacity-100' : 'opacity-0')}
          />
        ))}
        {backdrops.map(path => (
          <div
            key={path}
            className={cn('absolute inset-0 transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]', slide.backdrop === path ? 'opacity-100' : 'opacity-0')}
          >
            <PosterFill path={path} size="w780" className="object-cover opacity-40" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-ns-bg via-ns-bg/85 to-ns-bg/70" />
          </div>
        ))}
      </div>

      <div className="relative z-20 mx-auto w-full max-w-5xl px-4 pt-3 sm:px-6 sm:pt-5">
        <div role="group" aria-label="Wrapped slides" className="flex gap-1">
          {slides.map((item, index) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setCurrent(index)}
              aria-label={`${item.name}, slide ${index + 1} of ${total}`}
              aria-current={index === current ? 'step' : undefined}
              className="group flex h-11 min-w-0 flex-1 items-center"
            >
              <span className="relative block h-1 w-full overflow-hidden rounded-full bg-ns-text/20">
                <span className={cn(
                  'absolute inset-0 origin-left rounded-full bg-ns-text transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
                  index <= current ? 'scale-x-100' : 'scale-x-0',
                )} />
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Link href="/dashboard" className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-full pr-3 text-sm font-semibold text-ns-text">
            <ChevronIcon direction="left" size={18} />
            Dashboard
          </Link>
          <h1 className="truncate font-heading text-base font-bold tabular-nums text-ns-text">{year} Wrapped</h1>
          <button
            type="button"
            onClick={share}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-text/10"
          >
            <ShareIcon size={16} />
            <span key={String(copied)} className="animate-fade-up">{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      <div
        onClick={handleStageClick}
        className="relative z-10 flex min-h-0 flex-1 cursor-pointer overflow-y-auto px-4 py-4 sm:px-6"
      >
        <div key={slide.key} className="m-auto flex w-full cursor-auto flex-col items-center">
          {slide.content}
        </div>
      </div>

      <p role="status" className="sr-only">{slide.name}, slide {current + 1} of {total}</p>

      <div className="relative z-20 mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 pb-5 pt-2 sm:px-6 sm:pb-7">
        <button
          type="button"
          onClick={prev}
          disabled={current === 0}
          aria-label="Previous slide"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-ns-text/10 text-ns-text transition-colors duration-150 hover:bg-ns-text/20 disabled:cursor-not-allowed disabled:text-ns-subtle disabled:hover:bg-ns-text/10"
        >
          <ChevronIcon direction="left" size={22} />
        </button>
        {current < total - 1 ? (
          <Button size="lg" onClick={next}>
            Next <ChevronIcon direction="right" size={18} />
          </Button>
        ) : (
          <Button size="lg" href="/dashboard">Done</Button>
        )}
      </div>
    </div>
  )
}
