import { notFound }      from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions }   from '@/lib/auth'
import { getCollection } from '@/services/collections'
import { getUserVote, trackView } from '@/services/collection-votes'
import { getRelatedCollections } from '@/services/collection-community'
import { prisma }        from '@/lib/db'
import Link              from 'next/link'
import PosterFill from '@/components/watchlist/PosterFill'
import { formatYear } from '@/lib/utils'
import OwnerCollectionActions   from '@/components/collections/OwnerCollectionActions'
import VisitorCollectionActions from '@/components/collections/VisitorCollectionActions'
import EmptyCollectionCTA from '@/components/collections/EmptyCollectionCTA'
import VoteButtons        from '@/components/collections/VoteButtons'
import RelatedCollections from '@/components/collections/RelatedCollections'
import BackLink          from '@/components/collections/BackLink'
import Badge             from '@/components/ui/Badge'
import EmptyState        from '@/components/ui/EmptyState'
import type { CSSProperties } from 'react'
import type { Metadata }  from 'next'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const session = await getServerSession(authOptions)
  const col    = await getCollection(id, session?.user?.id ?? null)
  return { title: col ? `${col.title} — NoSpoilers` : 'Collection' }
}

export default async function CollectionPage({ params }: Props) {
  const { id }  = await params
  const session = await getServerSession(authOptions)
  const col     = await getCollection(id, session?.user?.id ?? null)
  if (!col) notFound()

  const myId   = session?.user?.id ?? null
  const isOwner = myId === col.userId

  // Fetch analytics, user's vote, and (for visitors) follow status — in parallel
  const [analytics, userVote, followRow] = await Promise.all([
    prisma.collectionAnalytics.findUnique({ where: { collectionId: id } }),
    myId ? getUserVote(myId, id) : null,
    // Check if viewer follows the owner (only relevant for non-owner visitors)
    myId && !isOwner
      ? prisma.userFollow.findUnique({ where: { followerId_followingId: { followerId: myId, followingId: col.userId } } })
      : null,
  ])

  // Check friendship too (for VisitorCollectionActions)
  const friendRow = myId && !isOwner
    ? await prisma.friendship.findFirst({
        where: {
          OR: [
            { userAId: myId, userBId: col.userId },
            { userAId: col.userId, userBId: myId },
          ],
        },
      })
    : null

  // Track view (fire-and-forget, only for non-owner)
  if (myId !== col.userId) {
    trackView(id).catch(() => {})
  }

  const upvotes   = analytics?.upvotes         ?? 0
  const downvotes = analytics?.downvotes        ?? 0
  const score     = analytics?.score            ?? 0
  const views     = analytics?.views            ?? 0
  const popScore  = analytics?.popularityScore  ?? 0

  return (
    <div className="mx-auto min-h-dvh max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:pt-10">
      <BackLink href="/collections">Collections</BackLink>

      <header className="mb-12 mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8 lg:gap-10">
        {col.coverPath && (
          <div className="relative aspect-[2/3] w-36 flex-shrink-0 overflow-hidden rounded-xl bg-ns-surface shadow-2xl ring-1 ring-inset ring-white/5 sm:w-44 lg:w-56">
            <PosterFill
              path={col.coverPath}
              size="w500"
              priority
              className="object-cover"
              sizes="(max-width: 640px) 144px, (max-width: 1024px) 176px, 224px"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-base text-ns-muted">
            <span>
              by{' '}
              <Link href={`/profile/${col.username}`} className="font-semibold text-ns-text transition-colors duration-150 hover:text-ns-secondary-readable">
                @{col.username}
              </Link>
            </span>
            {!col.isPublic && <Badge variant="muted">Private</Badge>}
          </p>
          <h1 className="mt-2 break-words font-display text-4xl text-ns-text sm:text-5xl lg:text-6xl">
            {col.title}
          </h1>
          {col.description && (
            <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ns-muted">{col.description}</p>
          )}

          <dl className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm tabular-nums text-ns-muted">
            <div className="flex gap-1">
              <dd className="font-semibold text-ns-text">{col.movieCount}</dd>
              <dt>film{col.movieCount !== 1 ? 's' : ''}</dt>
            </div>
            {views > 0 && (
              <div className="flex gap-1">
                <dd className="font-semibold text-ns-text">{views.toLocaleString()}</dd>
                <dt>view{views !== 1 ? 's' : ''}</dt>
              </div>
            )}
            {isOwner && (upvotes > 0 || downvotes > 0) && (
              <>
                <div className="flex gap-1">
                  <dd className="font-semibold text-ns-success">{upvotes}</dd>
                  <dt>upvote{upvotes !== 1 ? 's' : ''}</dt>
                </div>
                {downvotes > 0 && (
                  <div className="flex gap-1">
                    <dd className="font-semibold text-ns-danger">{downvotes}</dd>
                    <dt>downvote{downvotes !== 1 ? 's' : ''}</dt>
                  </div>
                )}
              </>
            )}
            {isOwner && (upvotes > 0 || downvotes > 0) && (
              <div className="flex gap-1">
                <dt>Score:</dt>
                <dd className={`font-semibold ${score > 0 ? 'text-ns-success' : score < 0 ? 'text-ns-danger' : 'text-ns-text'}`}>
                  {score > 0 ? '+' : ''}{score}
                </dd>
              </div>
            )}
            {popScore > 0 && (
              <div className="flex gap-1">
                <dd className="font-semibold text-ns-text">{popScore.toFixed(1)}</dd>
                <dt>popularity</dt>
              </div>
            )}
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {!isOwner && (
              <VoteButtons
                collectionId={col.id}
                ownerId={col.userId}
                initialVotes={{ upvotes, downvotes, score }}
                initialVote={userVote}
              />
            )}
            {isOwner ? (
              <OwnerCollectionActions
                collectionId={col.id}
                title={col.title}
                description={col.description}
                isPublic={col.isPublic}
                movies={col.movies}
              />
            ) : myId ? (
              <VisitorCollectionActions
                collectionId={col.id}
                collectionTitle={col.title}
                ownerUsername={col.username}
                isFollowingOwner={!!followRow}
                isFriendWithOwner={!!friendRow}
              />
            ) : null}
          </div>
        </div>
      </header>

      {col.movies.length === 0 ? (
        isOwner
          ? <EmptyCollectionCTA />
          : <EmptyState title="No movies in this collection yet." description="Check back once the creator adds a few films." />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {col.movies.map((movie, i) => (
            <div
              key={movie.tmdbId}
              className={i > 5 ? 'ns-reveal' : undefined}
              style={i > 5 ? ({ '--i': Math.min(i % 6, 7) } as CSSProperties) : undefined}
            >
              <Link href={`/movie/${movie.tmdbId}`} className="group block min-w-0">
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface ring-1 ring-inset ring-white/5">
                  <PosterFill
                    path={movie.posterPath}
                    size="w342"
                    className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                  />
                  <span className="absolute left-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-black/75 px-1.5 text-xs font-bold tabular-nums text-white">
                    {i + 1}
                  </span>
                </div>
                <p className="mt-2.5 truncate font-heading text-base font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
                  {movie.title}
                </p>
                <p className="mt-0.5 text-sm tabular-nums text-ns-muted">{formatYear(movie.releaseDate)}</p>
              </Link>
            </div>
          ))}
        </div>
      )}

      <RelatedCollections collectionId={col.id} />
    </div>
  )
}
