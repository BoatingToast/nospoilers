'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import ReviewStats    from './ReviewStats'
import WriteReview    from './WriteReview'
import ReviewCard     from './ReviewCard'
import type { ReviewWithMeta } from '@/services/reviews'
import { FilmIcon, ArrowRightIcon } from '@/components/icons'

type SortMode = 'helpful' | 'popular' | 'top' | 'newest' | 'friends'

interface Props {
  tmdbId:     number
  movieTitle: string
}

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'helpful',  label: 'Most Helpful'  },
  { value: 'popular',  label: 'Most Popular'  },
  { value: 'top',      label: 'Highest Rated' },
  { value: 'newest',   label: 'Newest'        },
  { value: 'friends',  label: 'Friends'       },
]

export default function ReviewSection({ tmdbId, movieTitle }: Props) {
  const { data: session } = useSession()
  const sessionId         = (session?.user as { id?: string })?.id ?? undefined

  const [reviews,      setReviews]      = useState<ReviewWithMeta[]>([])
  const [userReview,   setUserReview]   = useState<ReviewWithMeta | null>(null)
  const [sort,         setSort]         = useState<SortMode>('helpful')
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editingOwn,   setEditingOwn]   = useState(false)
  const [statsRefresh, setStatsRefresh] = useState(0)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        fetch(`/api/reviews?tmdbId=${tmdbId}&sort=${sort}`),
        sessionId ? fetch(`/api/reviews/stats?tmdbId=${tmdbId}`) : null,
      ])
      const reviewData = await reviewsRes.json()
      setReviews(reviewData.reviews ?? [])

      if (statsRes) {
        const statsData = await statsRes.json()
        setUserReview(statsData.userReview ?? null)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [tmdbId, sort, sessionId])

  useEffect(() => { void fetchReviews() }, [fetchReviews, statsRefresh])

  function handleSaved(review: ReviewWithMeta) {
    setUserReview(review)
    setShowForm(false)
    setEditingOwn(false)
    setStatsRefresh(n => n + 1)
    // Update in list if editing, else prepend
    setReviews(prev => {
      const exists = prev.find(r => r.id === review.id)
      return exists
        ? prev.map(r => r.id === review.id ? review : r)
        : [review, ...prev]
    })
  }

  function handleDeleted(id: string) {
    setUserReview(null)
    setReviews(prev => prev.filter(r => r.id !== id))
    setStatsRefresh(n => n + 1)
  }

  // Separate friend reviews for the "Friends Who Reviewed" banner
  const friendReviews = reviews.filter(r => r.isFriend && r.userId !== sessionId)

  // Reviews excluding own (shown separately at top)
  const otherReviews = reviews.filter(r => r.userId !== sessionId)

  return (
    <section className="mt-14">
      {/* Section header */}
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="font-display text-3xl tracking-wider text-ns-text">COMMUNITY REVIEWS</h2>
        {session && !userReview && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-heading font-medium text-ns-gold hover:text-amber-400 transition-colors"
          >
            + Write a Review
          </button>
        )}
      </div>

      {/* Stats bar */}
      <ReviewStats key={statsRefresh} tmdbId={tmdbId} />

      {/* Write / edit form */}
      {(showForm && !userReview) && (
        <div className="mb-8">
          <WriteReview
            tmdbId={tmdbId}
            movieTitle={movieTitle}
            existing={null}
            onSaved={handleSaved}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Own review — pinned at top */}
      {userReview && (
        <div className="mb-8">
          <p className="text-[10px] font-body text-ns-muted uppercase tracking-widest mb-3">Your Review</p>
          {editingOwn ? (
            <WriteReview
              tmdbId={tmdbId}
              movieTitle={movieTitle}
              existing={userReview}
              onSaved={handleSaved}
              onCancel={() => setEditingOwn(false)}
            />
          ) : (
            <ReviewCard
              review={userReview}
              isOwn={true}
              onEdit={() => setEditingOwn(true)}
              onDeleted={handleDeleted}
              sessionId={sessionId}
            />
          )}
        </div>
      )}

      {/* Friend reviews banner */}
      {friendReviews.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] font-body text-ns-muted uppercase tracking-widest mb-3">
            Friends Who Reviewed This
          </p>
          <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-ns-gold/4 border border-ns-gold/15">
            {friendReviews.map(r => (
              <Link
                key={r.id}
                href={`/profile/${r.username}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ns-gold/10 border border-ns-gold/20
                           hover:bg-ns-gold/20 transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-ns-gold/30 flex items-center justify-center text-ns-gold text-[10px] font-bold">
                  {r.username[0]?.toUpperCase()}
                </span>
                <span className="text-ns-gold text-xs font-heading font-medium">@{r.username}</span>
                {r.rating !== null && (
                  <span className="text-ns-muted text-[10px] font-body">{r.rating}/100</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sort controls */}
      {(otherReviews.length > 0 || loading) && (
        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto scrollbar-hide pb-1">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-heading font-medium whitespace-nowrap border transition-all ${
                sort === opt.value
                  ? 'bg-ns-gold/15 border-ns-gold/40 text-ns-gold'
                  : 'border-ns-border text-ns-muted hover:text-white hover:border-white/20'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <div className="flex-1" />
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-ns-surface border border-ns-border p-5 h-40" />
          ))}
        </div>
      ) : otherReviews.length === 0 && !userReview ? (
        <div className="text-center py-16">
          <FilmIcon size={44} className="text-ns-gold/30 mx-auto mb-4" />
          <p className="font-heading text-lg text-white mb-2">No reviews yet</p>
          <p className="text-ns-muted text-sm font-body mb-6">
            Be the first to share your thoughts on {movieTitle}.
          </p>
          {session ? (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2.5 rounded-xl bg-ns-gold text-ns-bg text-sm font-heading font-semibold
                         hover:bg-amber-400 transition-colors"
            >
              Write the First Review
            </button>
          ) : (
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-xl bg-ns-gold text-ns-bg text-sm font-heading font-semibold
                         hover:bg-amber-400 transition-colors"
            >
              Sign In to Review
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Friend reviews first in default sort */}
          {sort !== 'friends' && friendReviews.length > 0 && (
            <div className="space-y-4">
              {friendReviews.map(review => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  isOwn={false}
                  sessionId={sessionId}
                />
              ))}
              {otherReviews.filter(r => !r.isFriend).length > 0 && (
                <div className="border-t border-ns-border pt-4" />
              )}
            </div>
          )}

          {/* Remaining reviews */}
          {(sort === 'friends' ? otherReviews : otherReviews.filter(r => !r.isFriend)).map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              isOwn={review.userId === sessionId}
              onEdit={review.userId === sessionId ? () => setEditingOwn(true) : undefined}
              onDeleted={review.userId === sessionId ? handleDeleted : undefined}
              sessionId={sessionId}
            />
          ))}

          {/* CTA to write if no own review yet */}
          {session && !userReview && !showForm && otherReviews.length > 0 && (
            <div className="pt-2 text-center">
              <button
                onClick={() => setShowForm(true)}
                className="px-5 py-2 rounded-xl border border-ns-gold/40 text-ns-gold text-sm font-heading font-medium
                           hover:bg-ns-gold/10 transition-colors"
              >
                Add Your Review
              </button>
            </div>
          )}
        </div>
      )}

      {/* Not signed in CTA */}
      {!session && (
        <div className="mt-8 text-center py-8 rounded-2xl border border-dashed border-ns-border">
          <p className="text-ns-muted text-sm font-body mb-3">
            Sign in to write a review, vote, and see friend reviews.
          </p>
          <Link
            href="/login"
            className="text-ns-gold text-sm font-heading font-medium hover:text-amber-400 transition-colors"
          >
            Sign In <ArrowRightIcon size={12} className="inline-block ml-0.5" />
          </Link>
        </div>
      )}
    </section>
  )
}
