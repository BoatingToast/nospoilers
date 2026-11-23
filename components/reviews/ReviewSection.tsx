'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import ReviewStats    from './ReviewStats'
import WriteReview    from './WriteReview'
import ReviewCard     from './ReviewCard'
import type { ReviewWithMeta } from '@/services/reviews'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

type SortMode = 'helpful' | 'popular' | 'top' | 'newest' | 'friends'

interface Props {
  tmdbId:     number
  movieTitle: string
}

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'helpful', label: 'Most helpful' },
  { value: 'popular', label: 'Most popular' },
  { value: 'top', label: 'Highest rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'friends', label: 'Friends' },
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
  const [loadFailed,   setLoadFailed]   = useState(false)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        fetch(`/api/reviews?tmdbId=${tmdbId}&sort=${sort}`),
        sessionId ? fetch(`/api/reviews/stats?tmdbId=${tmdbId}`) : null,
      ])
      setLoadFailed(!reviewsRes.ok)
      const reviewData = await reviewsRes.json()
      setReviews(reviewData.reviews ?? [])

      if (statsRes) {
        const statsData = await statsRes.json()
        setUserReview(statsData.userReview ?? null)
      }
    } catch {
      setLoadFailed(true)
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

  const listedReviews = sort === 'friends' ? otherReviews : otherReviews.filter(r => !r.isFriend)
  const pillClass = (selected: boolean) => `min-h-11 flex-shrink-0 rounded-full px-4 text-sm font-semibold transition-colors duration-150 ${
    selected ? 'bg-ns-text text-ns-bg' : 'text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text'
  }`

  return (
    <section aria-labelledby="community-reviews-heading">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 id="community-reviews-heading" className="font-display text-4xl text-ns-text sm:text-5xl">
          Community reviews
        </h2>
        {session && !userReview && !showForm && (
          <Button variant="secondary" onClick={() => setShowForm(true)}>
            Write a review
          </Button>
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
          <h3 className="mb-3 font-heading text-lg font-semibold text-ns-text">Your review</h3>
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

      {/* Friend reviews banner */}
      {friendReviews.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 font-heading text-lg font-semibold text-ns-text">Friends who reviewed this</h3>
          <div className="flex flex-wrap gap-2">
            {friendReviews.map(r => (
              <Link
                key={r.id}
                href={`/profile/${r.username}`}
                className="flex min-h-11 max-w-full items-center gap-2 rounded-full bg-ns-surface px-3 transition-colors duration-150 hover:bg-ns-surface-2"
              >
                <Avatar src={r.avatarUrl} username={r.username} size="xs" />
                <span className="truncate font-heading text-sm font-semibold text-ns-text">@{r.username}</span>
                {r.rating !== null && (
                  <span className="flex-shrink-0 text-sm tabular-nums text-ns-muted">{r.rating}/100</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sort controls */}
      {(otherReviews.length > 0 || loading) && (
        <div role="group" aria-label="Sort reviews" className="scrollbar-hide -mx-4 mb-6 flex items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={sort === opt.value}
              onClick={() => setSort(opt.value)}
              className={pillClass(sort === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <div className="space-y-4" role="status" aria-label="Loading reviews">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : loadFailed && otherReviews.length === 0 ? (
        <div role="alert">
          <EmptyState
            title="Reviews could not load"
            description="Check your connection and try again."
            action={<Button variant="secondary" className="!bg-ns-surface-2 hover:!bg-ns-surface-3" onClick={() => void fetchReviews()}>Try again</Button>}
          />
        </div>
      ) : otherReviews.length === 0 && !userReview ? (
        showForm ? null : (
          <EmptyState
            title="No reviews yet"
            description={session
              ? `Be the first to share your thoughts on ${movieTitle}.`
              : `Be the first to share your thoughts on ${movieTitle}. Sign in to write a review, vote, and see friend reviews.`}
            action={session ? (
              <Button variant="secondary" className="!bg-ns-surface-2 hover:!bg-ns-surface-3" onClick={() => setShowForm(true)}>
                Write the first review
              </Button>
            ) : (
              <Button variant="secondary" className="!bg-ns-surface-2 hover:!bg-ns-surface-3" href="/login">
                Sign in to review
              </Button>
            )}
          />
        )
      ) : (
        <div className="space-y-4">
          {/* Friend reviews first in default sort */}
          {sort !== 'friends' && friendReviews.map((review, index) => (
            <div key={review.id} className="ns-reveal" style={{ '--i': Math.min(index, 7) } as React.CSSProperties}>
              <ReviewCard
                review={review}
                isOwn={false}
                sessionId={sessionId}
                sessionAvatarUrl={sessionAvatarUrl}
                sessionUsername={sessionUsername}
              />
            </div>
          ))}

          {/* Remaining reviews */}
          {listedReviews.map((review, index) => (
            <div key={review.id} className="ns-reveal" style={{ '--i': Math.min(index, 7) } as React.CSSProperties}>
              <ReviewCard
                review={review}
                isOwn={review.userId === sessionId}
                onEdit={review.userId === sessionId ? () => setEditingOwn(true) : undefined}
                onDeleted={review.userId === sessionId ? handleDeleted : undefined}
                sessionId={sessionId}
                sessionAvatarUrl={sessionAvatarUrl}
                sessionUsername={sessionUsername}
              />
            </div>
          ))}

          {/* CTA to write if no own review yet */}
          {session && !userReview && !showForm && otherReviews.length > 0 && (
            <div className="pt-2 text-center">
              <Button variant="outline" onClick={() => setShowForm(true)}>
                Add your review
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Not signed in CTA */}
      {!session && !loading && otherReviews.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-ns-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-base text-ns-muted">
            Sign in to write a review, vote, and see friend reviews.
          </p>
          <Button variant="secondary" href="/login" className="flex-shrink-0 !bg-ns-surface-2 hover:!bg-ns-surface-3">
            Sign in
          </Button>
        </div>
      )}
    </section>
  )
}
