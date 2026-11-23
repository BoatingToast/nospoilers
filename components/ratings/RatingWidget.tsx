'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { EditIcon, StarIcon } from '@/components/icons'
import type { MovieRatingData } from '@/types'

const QuickRatingModal    = dynamic(() => import('./QuickRatingModal'),    { ssr: false })
const DetailedRatingModal = dynamic(() => import('./DetailedRatingModal'), { ssr: false })

function scoreColor(v: number): string {
  if (v >= 80) return 'text-ns-secondary-readable'
  if (v >= 60) return 'text-ns-success'
  if (v >= 40) return 'text-ns-info'
  return 'text-ns-danger'
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
    genreIds:    number[]
    runtime:     number | null
    voteAverage: number
    voteCount:   number
    popularity:  number
    originalLanguage: string
    budget:      number
    keywords:    string[]
  }
}

type ModalState = 'none' | 'quick' | 'detailed'

export default function RatingWidget({ movie }: Props) {
  const { status } = useSession()
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
    return <div aria-hidden="true" className="min-h-11 w-36 animate-pulse rounded-full bg-ns-surface" />
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
      {rating ? (
        <button
          type="button"
          onClick={() => setModal('quick')}
          className="group inline-flex min-h-11 animate-fade-up items-center gap-2.5 rounded-full bg-ns-surface py-1 pl-4 pr-3 transition-colors duration-150 hover:bg-ns-surface-2"
        >
          <span className={`font-display text-2xl tabular-nums ${scoreColor(rating.score)}`}>
            {rating.score}
          </span>
          <span className="flex flex-col items-start">
            <span className="text-xs leading-tight text-ns-muted">Your rating</span>
            <span className={`text-xs font-semibold leading-tight ${scoreColor(rating.score)}`}>
              {scoreLabel(rating.score)}
            </span>
          </span>
          {hasSubRatings && (
            <span className="h-1.5 w-1.5 rounded-full bg-ns-accent" title="Detailed rating" />
          )}
          <EditIcon size={14} className="text-ns-muted transition-colors duration-150 group-hover:text-ns-text" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setModal('quick')}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ns-surface px-5 text-sm font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-surface-2"
        >
          <StarIcon size={16} />
          Rate this film
        </button>
      )}

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
