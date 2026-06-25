'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import type { MovieRatingData } from '@/types'

const QuickRatingModal    = dynamic(() => import('./QuickRatingModal'),    { ssr: false })
const DetailedRatingModal = dynamic(() => import('./DetailedRatingModal'), { ssr: false })

function scoreColor(v: number): string {
  if (v >= 80) return 'text-ns-gold'
  if (v >= 60) return 'text-green-400'
  if (v >= 40) return 'text-blue-400'
  return 'text-red-400'
}

function scoreLabel(v: number): string {
  if (v >= 90) return 'Masterpiece'
  if (v >= 80) return 'Loved it'
  if (v >= 70) return 'Really good'
  if (v >= 60) return 'Liked it'
  if (v >= 50) return 'Decent'
  if (v >= 40) return 'Mixed'
  return 'Disliked'
}

interface Props {
  movie: {
    tmdbId:      number
    title:       string
    posterPath:  string | null
    releaseDate: string | null
  }
}

type ModalState = 'none' | 'quick' | 'detailed'

export default function RatingWidget({ movie }: Props) {
  const { data: session, status } = useSession()
  const [modal,   setModal]   = useState<ModalState>('none')
  const [rating,  setRating]  = useState<MovieRatingData | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch existing rating on mount
  useEffect(() => {
    if (status !== 'authenticated') return
    setLoading(true)
    fetch(`/api/ratings/${movie.tmdbId}`)
      .then(r => r.json())
      .then(d => setRating(d.rating ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [movie.tmdbId, status])

  if (status === 'unauthenticated') return null
  if (loading) {
    return (
      <div className="h-10 w-32 rounded-xl bg-ns-surface border border-ns-border animate-pulse" />
    )
  }

  function handleSaved(r: MovieRatingData) {
    setRating(r)
    setModal('none')
  }
  function handleDeleted() {
    setRating(null)
    setModal('none')
  }

  const hasSubRatings = rating && (
    rating.storytelling !== null || rating.characters !== null ||
    rating.entertainment !== null || rating.emotion !== null
  )

  return (
    <>
      {/* Widget button */}
      {rating ? (
        /* Rated state */
        <button
          onClick={() => setModal('quick')}
          className="group flex items-center gap-2.5 px-3 py-2 rounded-xl
                     bg-ns-surface border border-ns-border hover:border-ns-gold/40
                     transition-all duration-150"
        >
          {/* Score badge */}
          <span className={`font-display text-xl tracking-wider ${scoreColor(rating.score)}`}>
            {rating.score}
          </span>
          <div className="flex flex-col items-start">
            <span className="text-[10px] text-ns-muted font-body leading-tight">Your rating</span>
            <span className={`text-xs font-body font-medium leading-tight ${scoreColor(rating.score)}`}>
              {scoreLabel(rating.score)}
            </span>
          </div>
          {/* Sub-rating dot indicator */}
          {hasSubRatings && (
            <span className="w-1.5 h-1.5 rounded-full bg-ns-gold opacity-60" title="Detailed rating" />
          )}
          {/* Edit icon */}
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"
            viewBox="0 0 24 24" className="text-ns-muted/50 group-hover:text-ns-gold/60 transition-colors">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      ) : (
        /* Unrated state */
        <button
          onClick={() => setModal('quick')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl
                     bg-ns-surface border border-dashed border-ns-border
                     text-ns-muted text-sm font-body
                     hover:border-ns-gold/40 hover:text-ns-text
                     transition-all duration-150"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          Rate this film
        </button>
      )}

      {/* Modals */}
      {modal === 'quick' && (
        <QuickRatingModal
          movie={movie}
          existing={rating}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onClose={() => setModal('none')}
          onGoDetailed={() => setModal('detailed')}
        />
      )}
      {modal === 'detailed' && (
        <DetailedRatingModal
          movie={movie}
          existing={rating}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onClose={() => setModal('none')}
        />
      )}
    </>
  )
}
