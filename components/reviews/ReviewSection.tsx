'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import ReviewStats    from './ReviewStats'
import WriteReview    from './WriteReview'
import ReviewCard     from './ReviewCard'
import type { ReviewWithMeta } from '@/services/reviews'
import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'
import Avatar from '@/components/ui/Avatar'

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
  const sessionAvatarUrl  = session?.user?.image ?? null
  const sessionUsername   = session?.user?.name ?? undefined

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
    <Section
      title="COMMUNITY REVIEWS"
      action={session && !userReview && !showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="min-h-10 font-heading text-sm text-ns-secondary-readable underline underline-offset-4 transition-colors hover:text-ns-text"
        >
          + Write a Review
        </button>
      ) : undefined}
    >
      {/* Stats row */}
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
          <p className="text-[11px] font-body text-ns-muted uppercase tracking-widest mb-3">Your Review</p>
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
              sessionAvatarUrl={sessionAvatarUrl}
              sessionUsername={sessionUsername}
            />
          )}
        </div>
      )}

      {/* Friend reviews list */}
      {friendReviews.length > 0 && (
        <div className="mb-8">
          <p className="text-[11px] font-body text-ns-muted uppercase tracking-widest mb-1">
            Friends Who Reviewed This
          </p>
          <div className="flex flex-wrap gap-x-6">
            {friendReviews.map(r => (
              <Link
                key={r.id}
                href={`/profile/${r.username}`}
                className="group flex min-h-10 items-center gap-2"
              >
                <Avatar src={r.avatarUrl} username={r.username} size="xs" />
                <span className="text-ns-secondary-readable text-xs font-heading font-medium underline-offset-4 group-hover:underline">@{r.username}</span>
                {r.rating !== null && (
                  <span className="text-ns-muted text-[11px] font-body">{r.rating}/100</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sort controls */}
      {(otherReviews.length > 0 || loading) && (
        <div className="flex items-center gap-5 overflow-x-auto scrollbar-hide">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSort(opt.value)}
              aria-pressed={sort === opt.value}
              className={`min-h-10 whitespace-nowrap border-b-2 text-xs font-heading font-medium transition-colors ${
                sort === opt.value
                  ? 'border-ns-secondary-readable text-ns-secondary-readable'
                  : 'border-transparent text-ns-muted hover:text-ns-text'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse border-t border-ns-border py-5">
              <div className="h-4 w-40 max-w-full rounded bg-ns-border" />
              <div className="mt-4 h-3 w-full rounded bg-ns-border" />
              <div className="mt-2 h-3 w-2/3 rounded bg-ns-border" />
            </div>
          ))}
        </div>
      ) : otherReviews.length === 0 && !userReview ? (
        <div className="border-t border-ns-border pt-5">
          <p className="font-heading text-lg text-ns-text">No reviews yet</p>
          <p className="mt-1 mb-5 text-ns-muted text-sm font-body">
            Be the first to share your thoughts on {movieTitle}.
          </p>
          {session ? (
            <Button variant="secondary" onClick={() => setShowForm(true)} className="min-h-10">
              Write the First Review
            </Button>
          ) : (
            <Button variant="secondary" href="/login" className="min-h-10">
              Sign In to Review
            </Button>
          )}
        </div>
      ) : (
        <div>
          {/* Friend reviews first in default sort */}
          {sort !== 'friends' && friendReviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              isOwn={false}
              sessionId={sessionId}
              sessionAvatarUrl={sessionAvatarUrl}
              sessionUsername={sessionUsername}
            />
          ))}

          {/* Remaining reviews */}
          {(sort === 'friends' ? otherReviews : otherReviews.filter(r => !r.isFriend)).map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              isOwn={review.userId === sessionId}
              onEdit={review.userId === sessionId ? () => setEditingOwn(true) : undefined}
              onDeleted={review.userId === sessionId ? handleDeleted : undefined}
              sessionId={sessionId}
              sessionAvatarUrl={sessionAvatarUrl}
              sessionUsername={sessionUsername}
            />
          ))}

          {/* CTA to write if no own review yet */}
          {session && !userReview && !showForm && otherReviews.length > 0 && (
            <div className="border-t border-ns-border pt-5">
              <Button variant="outline" onClick={() => setShowForm(true)} className="min-h-10">
                Add Your Review
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Not signed in CTA */}
      {!session && (
        <p className="mt-8 border-t border-ns-border pt-5 text-ns-muted text-sm font-body">
          Sign in to write a review, vote, and see friend reviews.{' '}
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center font-heading text-ns-secondary-readable underline underline-offset-4 transition-colors hover:text-ns-text"
          >
            Sign In
          </Link>
        </p>
      )}
    </Section>
  )
}
