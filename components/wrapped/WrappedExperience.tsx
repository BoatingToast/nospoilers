'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import type { WrappedData } from '@/types'
import { MovieDnaIcon, WrappedIcon } from '@/components/icons'

interface Props {
  data:     WrappedData
  username: string
  year:     number
}

// ─── Each "slide" of the Wrapped experience ───────────────────────────────────

function Slide({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-6 py-20 snap-start ${className}`}>
      {children}
    </div>
  )
}

function StatNumber({ value, label, color = 'text-ns-gold' }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="text-center">
      <p className={`font-display text-8xl sm:text-9xl tracking-wider ${color} leading-none`}>{value}</p>
      <p className="text-ns-muted font-body text-sm mt-3 tracking-widest uppercase">{label}</p>
    </div>
  )
}

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
    <div className="fixed inset-0 bg-ns-bg overflow-hidden flex flex-col">
      {/* Background gradient per slide */}
      <div
        className="absolute inset-0 transition-all duration-700 opacity-30"
        style={{ background: `radial-gradient(ellipse at center, ${slide.accent}40 0%, transparent 70%)` }}
      />

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-6 pt-6">
        <Link href="/dashboard" className="text-ns-muted text-sm font-body hover:text-ns-text transition-colors">
          ← Dashboard
        </Link>
        <p className="text-ns-muted text-xs font-body tracking-widest">{year} WRAPPED</p>
        <button onClick={share} className="text-ns-gold text-sm font-body hover:text-ns-gold/80 transition-colors">
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>

      {/* Progress dots */}
      <div className="relative z-20 flex justify-center gap-1.5 pt-4">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1 rounded-full transition-all ${i === current ? 'w-6 bg-ns-gold' : 'w-1.5 bg-ns-border'}`}
          />
        ))}
      </div>

      {/* Slide content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 animate-fade-in">
        {slide.content}
      </div>

      {/* Navigation */}
      <div className="relative z-20 flex items-center justify-between px-6 pb-8">
        <button
          onClick={prev}
          disabled={current === 0}
          className="px-5 py-2.5 rounded-xl border border-ns-border text-ns-muted text-sm font-body disabled:opacity-20 hover:border-ns-muted/40 transition-colors"
        >
          ←
        </button>
        <p className="text-ns-muted/40 text-xs font-body">{current + 1} / {total}</p>
        {current < total - 1 ? (
          <button
            onClick={next}
            className="px-5 py-2.5 rounded-xl bg-ns-gold text-ns-bg text-sm font-body font-medium hover:bg-ns-gold/90 transition-colors"
          >
            Next →
          </button>
        ) : (
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-ns-gold text-ns-bg text-sm font-body font-medium hover:bg-ns-gold/90 transition-colors"
          >
            Done
          </Link>
        )}
      </div>
    </div>
  )
}

// ─── Slide builder ────────────────────────────────────────────────────────────

interface SlideData {
  accent:  string
  content: React.ReactNode
}

function buildSlides(data: WrappedData, username: string, year: number): SlideData[] {
  const slides: SlideData[] = []

  // 1 — Intro
  slides.push({
    accent: '#C8963E',
    content: (
      <div className="text-center">
        <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-6">NoSpoilers</p>
        <h1 className="font-display text-7xl sm:text-9xl tracking-wider text-ns-text leading-none mb-4">
          {year}
        </h1>
        <h2 className="font-display text-4xl sm:text-5xl tracking-wider text-ns-gold mb-6">
          WRAPPED
        </h2>
        <p className="text-ns-muted font-body text-sm">
          Your year in film, @{username}
        </p>
      </div>
    ),
  })

  // 2 — Movies watched
  slides.push({
    accent: '#22C55E',
    content: (
      <div className="text-center">
        <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-8">This year you watched</p>
        <StatNumber value={data.moviesWatched || '?'} label="Films" color={data.moviesWatched > 0 ? 'text-emerald-400' : 'text-ns-muted'} />
        {data.moviesWatched === 0 && (
          <p className="text-ns-muted font-body text-xs mt-6 max-w-xs text-center">
            Start adding movies to your watchlist and marking them as watched to track your journey!
          </p>
        )}
        {data.totalWatchTime && data.totalWatchTime > 0 && (
          <p className="text-ns-muted font-body text-sm mt-8">
            That&apos;s <span className="text-ns-text">{Math.round(data.totalWatchTime / 60)}h</span> of cinema
          </p>
        )}
      </div>
    ),
  })

  // 3 — Top genres
  if (data.topGenres.length > 0) {
    slides.push({
      accent: '#7C3AED',
      content: (
        <div className="text-center max-w-md">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-8">Your favorite genres</p>
          <div className="flex flex-col gap-4">
            {data.topGenres.map((genre, i) => (
              <div
                key={genre}
                className="relative overflow-hidden rounded-2xl border border-ns-border bg-ns-surface"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                <div
                  className="absolute inset-0 opacity-20"
                  style={{ background: `linear-gradient(90deg, #7C3AED${(3 - i) * 30}% , transparent)`, width: `${(3 - i) * 33}%` }}
                />
                <div className="flex items-center justify-between px-6 py-4 relative z-10">
                  <span className="text-ns-text font-body text-lg font-medium">{genre}</span>
                  <span className="text-violet-400 font-display text-2xl tracking-wider">#{i + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    })
  }

  // 4 — Top movies
  if (data.topMovies.length > 0) {
    slides.push({
      accent: '#C8963E',
      content: (
        <div className="text-center max-w-lg w-full">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-8">
            {data.moviesWatched > 0 ? 'Your top films this year' : 'Your all-time favorites'}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            {data.topMovies.slice(0, 5).map((movie, i) => (
              <div key={movie.tmdbId} className="flex flex-col items-center">
                <div className="relative w-[80px] h-[120px] sm:w-[100px] sm:h-[150px] rounded-xl overflow-hidden border border-ns-border">
                  <Image
                    src={tmdbImageUrl(movie.posterPath, 'w185')}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    sizes="100px"
                  />
                  <div className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full bg-ns-bg/80 flex items-center justify-center">
                    <span className="text-ns-gold text-[9px] font-body font-bold">{i + 1}</span>
                  </div>
                </div>
                <p className="text-ns-muted text-[9px] font-body mt-1.5 max-w-[80px] text-center leading-tight truncate">
                  {movie.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
    })
  }

  // 5 — DNA highlight
  if (data.topTrait) {
    slides.push({
      accent: '#C8963E',
      content: (
        <div className="text-center">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-8">Your defining trait</p>
          <MovieDnaIcon size={60} className="text-ns-gold mx-auto mb-6" />
          <p className="font-display text-5xl sm:text-6xl tracking-wider text-ns-gold mb-4">{data.topTrait.toUpperCase()}</p>
          <p className="text-ns-muted font-body text-sm max-w-xs mx-auto">
            This dimension dominates your Movie DNA — it defines what you look for in every film.
          </p>
        </div>
      ),
    })
  }

  // 6 — Personality
  if (data.personalityType) {
    slides.push({
      accent: '#7C3AED',
      content: (
        <div className="text-center">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-8">You are</p>
          <WrappedIcon size={64} className="text-violet-400 mx-auto mb-6" />
          <p className="font-display text-5xl sm:text-6xl tracking-wider text-violet-400 leading-none mb-4">
            {data.personalityType.toUpperCase()}
          </p>
          <p className="text-ns-muted font-body text-sm">Your Movie Personality for {year}</p>
        </div>
      ),
    })
  }

  // 7 — Achievements
  slides.push({
    accent: '#F59E0B',
    content: (
      <div className="text-center">
        <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-8">Achievements unlocked</p>
        <StatNumber value={data.achievementsEarned} label="Badges Earned" color="text-amber-400" />
        {data.achievementsEarned > 0 ? (
          <p className="text-ns-muted font-body text-sm mt-6">Keep watching to unlock more!</p>
        ) : (
          <p className="text-ns-muted font-body text-xs mt-6 max-w-xs text-center">
            Start watching movies to earn your first achievement badges.
          </p>
        )}
      </div>
    ),
  })

  // 8 — Finale / share card
  slides.push({
    accent: '#C8963E',
    content: (
      <div className="text-center max-w-sm">
        <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-6">
          NoSpoilers · {year} Wrapped
        </p>
        <div className="bg-ns-surface border border-ns-border rounded-2xl p-8 mb-8">
          <p className="font-display text-3xl tracking-wider text-ns-gold mb-4">@{username}</p>
          <div className="flex justify-center gap-8 text-center">
            <div>
              <p className="font-display text-3xl tracking-wider text-ns-text">{data.moviesWatched}</p>
              <p className="text-ns-muted text-xs font-body">Films</p>
            </div>
            <div>
              <p className="font-display text-3xl tracking-wider text-ns-text">{data.achievementsEarned}</p>
              <p className="text-ns-muted text-xs font-body">Badges</p>
            </div>
            {data.personalityType && (
              <div>
                <p className="font-display text-xl tracking-wider text-ns-gold">{data.personalityType.split(' ').pop()}</p>
                <p className="text-ns-muted text-xs font-body">Personality</p>
              </div>
            )}
          </div>
          {data.topGenres[0] && (
            <div className="mt-4 pt-4 border-t border-ns-border">
              <p className="text-ns-muted text-xs font-body">Top Genre: <span className="text-ns-text">{data.topGenres[0]}</span></p>
            </div>
          )}
        </div>
        <p className="text-ns-muted text-xs font-body">nospoilers.app · Your cinematic journey</p>
      </div>
    ),
  })

  return slides
}
