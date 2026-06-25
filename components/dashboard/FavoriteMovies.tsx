'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import Top5Editor from '@/components/top-five/Top5Editor'
import { FilmIcon } from '@/components/icons'
import type { TopFiveEntry } from '@/services/top-five'

// Props kept minimal — no longer needs favorites passed from server
// since it fetches Top 5 client-side (always fresh)
export default function FavoriteMovies() {
  const [movies,   setMovies]   = useState<TopFiveEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch('/api/top-five')
      .then(r => r.json())
      .then(d => setMovies(d.movies ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [fetchKey])

  function handleSaved(saved: TopFiveEntry[]) {
    setEditing(false)
    setMovies(saved)
    setFetchKey(k => k + 1)
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl tracking-wider text-ns-text">TOP 5 FILMS</h2>
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-heading font-medium text-ns-gold hover:text-amber-400 transition-colors flex items-center gap-1.5"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Top 5
          </button>
        </div>

        {loading ? (
          <div className="flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-1 aspect-[2/3] animate-pulse rounded-xl bg-ns-surface border border-ns-border" />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ns-border p-10 text-center">
            <FilmIcon size={40} className="text-ns-gold/40 mx-auto mb-3" />
            <p className="font-heading font-medium text-white mb-1">No Top 5 set yet</p>
            <p className="text-ns-muted text-sm font-body mb-5">
              Your Top 5 films are the strongest influence on your Movie DNA and recommendations.
            </p>
            <button
              onClick={() => setEditing(true)}
              className="px-5 py-2 rounded-xl bg-ns-gold text-ns-bg text-sm font-heading font-semibold hover:bg-amber-400 transition-colors"
            >
              Choose Your Top 5
            </button>
          </div>
        ) : (
          <div className="flex gap-2 sm:gap-3">
            {movies.map(m => (
              <Link key={m.tmdbId} href={`/movie/${m.tmdbId}`} className="relative flex-1 group">
                {/* Rank badge */}
                <div className="absolute -top-2 -left-1 z-10 w-7 h-7 rounded-full bg-ns-bg border-2 border-ns-gold
                                flex items-center justify-center shadow-lg">
                  <span className="text-ns-gold font-display text-[9px] leading-none">{m.position}</span>
                </div>

                {/* Poster */}
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-ns-surface border border-ns-border
                                shadow-lg group-hover:border-ns-gold/50 transition-all duration-200 relative">
                  {m.posterPath ? (
                    <Image
                      src={tmdbImageUrl(m.posterPath, 'w342')}
                      alt={m.title}
                      fill sizes="(max-width: 640px) 18vw, 160px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FilmIcon size={28} className="text-ns-muted/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent
                                  opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                    <div>
                      <p className="text-white text-[10px] font-heading font-semibold leading-tight line-clamp-2">{m.title}</p>
                      {m.releaseDate && <p className="text-white/60 text-[9px] font-body">{formatYear(m.releaseDate)}</p>}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] font-body text-ns-muted mt-1.5 line-clamp-1 text-center group-hover:text-white transition-colors">
                  {m.title}
                </p>
              </Link>
            ))}

            {/* Empty slot prompts */}
            {Array.from({ length: 5 - movies.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex-1">
                <button
                  onClick={() => setEditing(true)}
                  className="w-full aspect-[2/3] rounded-xl border-2 border-dashed border-ns-border
                             hover:border-ns-gold/40 hover:bg-ns-gold/5 flex items-center justify-center
                             transition-all cursor-pointer group"
                >
                  <span className="text-ns-muted text-xl group-hover:text-ns-gold transition-colors">+</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {movies.length > 0 && (
          <p className="text-[10px] font-body text-ns-muted text-center mt-3">
            Your Top 5 contributes <span className="text-ns-gold">35%</span> of your Movie DNA ·{' '}
            <button onClick={() => setEditing(true)} className="text-ns-gold hover:text-amber-400 transition-colors">
              Edit order
            </button>
          </p>
        )}
      </div>

      {editing && (
        <Top5Editor
          initialMovies={movies}
          onSaved={handleSaved}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}
