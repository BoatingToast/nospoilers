'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import type { WrappedData } from '@/types'
import Button from '@/components/ui/Button'

interface Props {
  data:     WrappedData
  username: string
  year:     number
}

// ─── Slide building blocks ────────────────────────────────────────────────────

/** One slide: display content on the left, a ruled column of supporting text on the right. */
function SlideLayout({ heading, aside, children }: { heading?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`grid min-w-0 gap-8 lg:items-end lg:gap-10 ${aside ? 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]' : ''}`}>
      <div className="min-w-0">
        {heading && (
          <h2 className="mb-5 font-display text-3xl leading-none tracking-wide text-ns-text sm:text-4xl">{heading}</h2>
        )}
        {children}
      </div>
      {aside && (
        <div className="min-w-0 border-t-2 border-ns-text pt-4 font-body text-base leading-relaxed text-ns-text">
          {aside}
        </div>
      )}
    </div>
  )
}

function StatNumber({ value, label, color = 'text-ns-secondary-readable' }: { value: string | number; label: string; color?: string }) {
  return (
    <div>
      <p className={`font-display text-8xl leading-[0.86] tracking-wide sm:text-9xl ${color}`}>{value}</p>
      <p className="mt-3 font-body text-xs uppercase tracking-widest text-ns-muted">{label}</p>
    </div>
  )
}

const DISPLAY = 'break-words font-display text-[clamp(2.6rem,11vw,6rem)] leading-[0.88] tracking-wide'

// ─── Main component ───────────────────────────────────────────────────────────

export default function WrappedExperience({ data, username, year }: Props) {
  const [current, setCurrent] = useState(0)
  const [copied,  setCopied]  = useState(false)

  const slides = buildSlides(data, username, year)
  const total  = slides.length

  function next() { setCurrent(c => Math.min(c + 1, total - 1)) }
  function prev() { setCurrent(c => Math.max(c - 1, 0)) }

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

  const slide = slides[current]

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-ns-bg">
      {/* Top bar */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 pt-5 sm:px-6">
        <Link href="/dashboard" className="inline-flex min-h-10 items-center font-heading text-sm text-ns-muted underline-offset-4 hover:text-ns-text hover:underline">
          ← Dashboard
        </Link>
        <h1 className="font-heading text-xs tracking-widest text-ns-muted">{year} WRAPPED</h1>
        <button onClick={share} className="inline-flex min-h-10 items-center font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text">
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>

      {/* Progress */}
      <div className="mx-auto flex w-full max-w-6xl gap-1 px-4 pt-2 sm:px-6">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === current ? 'step' : undefined}
            className="flex h-6 flex-1 items-center"
          >
            <span className={`block h-0.5 w-full ${i <= current ? 'bg-ns-text' : 'bg-ns-border'}`} />
          </button>
        ))}
      </div>

      {/* Slide content */}
      <div className="flex min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto my-auto w-full min-w-0 max-w-6xl px-4 py-8 sm:px-6">
          {slide.content}
        </div>
      </div>

      {/* Navigation */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between border-t border-ns-border px-4 py-4 sm:px-6">
        <Button variant="outline" onClick={prev} disabled={current === 0} aria-label="Previous slide" className="min-h-10">
          ←
        </Button>
        <p className="font-body text-xs tabular-nums text-ns-muted">{current + 1} / {total}</p>
        {current < total - 1 ? (
          <Button variant="primary" onClick={next} className="min-h-10">
            Next →
          </Button>
        ) : (
          <Button variant="primary" href="/dashboard" className="min-h-10">
            Done
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Slide builder ────────────────────────────────────────────────────────────

interface SlideData {
  content: React.ReactNode
}

function buildSlides(data: WrappedData, username: string, year: number): SlideData[] {
  const slides: SlideData[] = []

  // 1 — Intro
  slides.push({
    content: (
      <SlideLayout aside={<p>Your year in film, @{username}</p>}>
        <p className={`${DISPLAY} text-ns-text`}>{year}</p>
        <h2 className={`${DISPLAY} text-ns-secondary-readable`}>WRAPPED</h2>
      </SlideLayout>
    ),
  })

  // 2 — Movies watched
  slides.push({
    content: (
      <SlideLayout
        heading="This year you watched"
        aside={
          data.moviesWatched === 0 || (data.totalWatchTime && data.totalWatchTime > 0) ? (
            <>
              {data.moviesWatched === 0 && (
                <p>
                  Start adding movies to your watchlist and marking them as watched to track your journey!
                </p>
              )}
              {data.totalWatchTime && data.totalWatchTime > 0 && (
                <p>
                  That&apos;s <span className="font-semibold">{Math.round(data.totalWatchTime / 60)}h</span> of cinema
                </p>
              )}
            </>
          ) : undefined
        }
      >
        <StatNumber value={data.moviesWatched || '?'} label="Films" color={data.moviesWatched > 0 ? 'text-ns-success' : 'text-ns-muted'} />
      </SlideLayout>
    ),
  })

  // 3 — Top genres
  if (data.topGenres.length > 0) {
    slides.push({
      content: (
        <SlideLayout heading="Your favorite genres">
          <ol className="max-w-2xl border-b border-ns-border">
            {data.topGenres.map((genre, i) => (
              <li key={genre} className="flex items-baseline gap-4 border-t border-ns-border py-4">
                <span className="w-10 flex-shrink-0 font-display text-2xl tracking-wide text-ns-chart-1">#{i + 1}</span>
                <span className="min-w-0 break-words font-display text-3xl leading-none tracking-wide text-ns-text sm:text-5xl">{genre}</span>
              </li>
            ))}
          </ol>
        </SlideLayout>
      ),
    })
  }

  // 4 — Top movies
  if (data.topMovies.length > 0) {
    slides.push({
      content: (
        <SlideLayout heading={data.moviesWatched > 0 ? 'Your top films this year' : 'Your all-time favorites'}>
          <ol className="grid grid-cols-3 gap-3 sm:flex sm:flex-wrap sm:gap-4">
            {data.topMovies.slice(0, 5).map((movie, i) => (
              <li key={movie.tmdbId} className="min-w-0 sm:w-[130px]">
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded border border-ns-border">
                  <Image
                    src={tmdbImageUrl(movie.posterPath, 'w185')}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    sizes="130px"
                  />
                </div>
                <p className="mt-2 flex gap-1.5 font-body text-xs leading-tight text-ns-muted">
                  <span className="font-semibold text-ns-secondary-readable">{i + 1}</span>
                  <span className="min-w-0 truncate">{movie.title}</span>
                </p>
              </li>
            ))}
          </ol>
        </SlideLayout>
      ),
    })
  }

  // 5 — DNA highlight
  if (data.topTrait) {
    slides.push({
      content: (
        <SlideLayout
          heading="Your defining trait"
          aside={
            <p>
              This dimension dominates your Movie DNA — it defines what you look for in every film.
            </p>
          }
        >
          <p className={`${DISPLAY} text-ns-secondary-readable`}>{data.topTrait.toUpperCase()}</p>
        </SlideLayout>
      ),
    })
  }

  // 6 — Personality
  if (data.personalityType) {
    slides.push({
      content: (
        <SlideLayout heading="You are" aside={<p>Your Movie Personality for {year}</p>}>
          <p className={`${DISPLAY} text-ns-chart-1`}>{data.personalityType.toUpperCase()}</p>
        </SlideLayout>
      ),
    })
  }

  // 7 — Achievements
  slides.push({
    content: (
      <SlideLayout
        heading="Achievements unlocked"
        aside={
          data.achievementsEarned > 0 ? (
            <p>Keep watching to unlock more!</p>
          ) : (
            <p>Start watching movies to earn your first achievement badges.</p>
          )
        }
      >
        <StatNumber value={data.achievementsEarned} label="Badges Earned" color="text-ns-warning" />
      </SlideLayout>
    ),
  })

  // 8 — Finale / share summary
  slides.push({
    content: (
      <SlideLayout
        aside={
          <>
            <p>NoSpoilers · {year} Wrapped</p>
            <dl className="mt-4 border-b border-ns-border">
              <div className="flex items-baseline justify-between gap-4 border-t border-ns-border py-3">
                <dt className="font-body text-sm text-ns-muted">Films</dt>
                <dd className="font-display text-3xl leading-none tracking-wide text-ns-text">{data.moviesWatched}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-ns-border py-3">
                <dt className="font-body text-sm text-ns-muted">Badges</dt>
                <dd className="font-display text-3xl leading-none tracking-wide text-ns-text">{data.achievementsEarned}</dd>
              </div>
              {data.personalityType && (
                <div className="flex items-baseline justify-between gap-4 border-t border-ns-border py-3">
                  <dt className="font-body text-sm text-ns-muted">Personality</dt>
                  <dd className="min-w-0 break-words text-right font-display text-2xl leading-none tracking-wide text-ns-secondary-readable">{data.personalityType.split(' ').pop()}</dd>
                </div>
              )}
              {data.topGenres[0] && (
                <div className="border-t border-ns-border py-3">
                  <p className="font-body text-sm text-ns-muted">Top Genre: <span className="text-ns-text">{data.topGenres[0]}</span></p>
                </div>
              )}
            </dl>
            <p className="mt-4 font-body text-xs text-ns-muted">nospoilers.app · Your cinematic journey</p>
          </>
        }
      >
        <p className={`${DISPLAY} text-ns-secondary-readable`}>@{username}</p>
      </SlideLayout>
    ),
  })

  return slides
}
