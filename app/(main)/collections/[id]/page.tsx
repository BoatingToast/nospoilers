import { notFound }      from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions }   from '@/lib/auth'
import { getCollection } from '@/services/collections'
import { getUserVote, trackView } from '@/services/collection-votes'
import { getRelatedCollections } from '@/services/collection-community'
import { prisma }        from '@/lib/db'
import Image             from 'next/image'
import Link              from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import OwnerCollectionActions   from '@/components/collections/OwnerCollectionActions'
import VisitorCollectionActions from '@/components/collections/VisitorCollectionActions'
import EmptyCollectionCTA from '@/components/collections/EmptyCollectionCTA'
import VoteButtons        from '@/components/collections/VoteButtons'
import RelatedCollections from '@/components/collections/RelatedCollections'
import type { Metadata }  from 'next'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const col    = await getCollection(id)
  return { title: col ? `${col.title} — NoSpoilers` : 'Collection' }
}

export default async function CollectionPage({ params }: Props) {
  const { id }  = await params
  const session = await getServerSession(authOptions)
  const col     = await getCollection(id)
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
    <div className="min-h-screen pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Back */}
        <Link href="/collections"
          className="inline-flex items-center gap-2 text-ns-muted text-sm font-body hover:text-ns-text transition-colors mb-8">
          ← Collections
        </Link>

        {/* Main grid: vote column + content */}
        <div className="flex gap-6 items-start mb-10">

          {/* Vote column — left side (visitors only) */}
          {!isOwner && (
            <div className="flex-shrink-0 hidden sm:flex">
              <VoteButtons
                collectionId={col.id}
                ownerId={col.userId}
                initialVotes={{ upvotes, downvotes, score }}
                initialVote={userVote}
              />
            </div>
          )}

          {/* Collection header */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                {!col.isPublic && (
                  <span className="text-ns-muted text-[10px] tracking-widest uppercase font-body
                                   border border-ns-border rounded-full px-2 py-0.5 mr-2">
                    Private
                  </span>
                )}
                <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-2 flex items-center gap-1.5">
                  by{' '}
                  <Link href={`/profile/${col.username}`}
                    className="text-ns-gold hover:text-amber-400 transition-colors">
                    @{col.username}
                  </Link>
                </p>
                <h1 className="font-display text-4xl sm:text-5xl tracking-wider text-ns-text mb-2 leading-tight">
                  {col.title.toUpperCase()}
                </h1>
                {col.description && (
                  <p className="text-ns-muted font-body text-sm max-w-xl leading-relaxed">{col.description}</p>
                )}
              </div>

              {/* Actions — owner vs visitor */}
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
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

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <span className="text-ns-muted/50 text-xs font-body">
                {col.movieCount} film{col.movieCount !== 1 ? 's' : ''}
              </span>

              {views > 0 && (
                <span className="text-ns-muted/50 text-xs font-body">
                  {views.toLocaleString()} view{views !== 1 ? 's' : ''}
                </span>
              )}

              {(upvotes > 0 || downvotes > 0) && (
                <>
                  <span className="flex items-center gap-1 text-emerald-400 text-xs font-body">
                    <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 19V5M5 12l7-7 7 7"/>
                    </svg>
                    {upvotes}
                  </span>
                  {downvotes > 0 && (
                    <span className="flex items-center gap-1 text-red-400/70 text-xs font-body">
                      <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 5v14M5 12l7 7 7-7"/>
                      </svg>
                      {downvotes}
                    </span>
                  )}
                  <span className={`text-xs font-body font-semibold
                    ${score > 0 ? 'text-emerald-400' : score < 0 ? 'text-red-400' : 'text-ns-muted'}`}>
                    Score: {score > 0 ? '+' : ''}{score}
                  </span>
                </>
              )}

              {popScore > 0 && (
                <span className="text-ns-gold/70 text-xs font-body">
                  {popScore.toFixed(1)} popularity
                </span>
              )}
            </div>

            {/* Mobile vote buttons — visitors only */}
            {!isOwner && (
              <div className="sm:hidden mt-4">
                <VoteButtons
                  collectionId={col.id}
                  ownerId={col.userId}
                  initialVotes={{ upvotes, downvotes, score }}
                  initialVote={userVote}
                  compact
                />
              </div>
            )}
          </div>
        </div>

        {/* Movies grid */}
        {col.movies.length === 0 ? (
          isOwner
            ? <EmptyCollectionCTA />
            : (
              <div className="border border-dashed border-ns-border rounded-2xl p-16 text-center">
                <p className="text-ns-muted font-body text-sm">No movies in this collection yet.</p>
              </div>
            )
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            {col.movies.map((movie, i) => (
              <Link key={movie.tmdbId} href={`/movie/${movie.tmdbId}`} className="group">
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-ns-surface border border-ns-border relative">
                  <Image
                    src={tmdbImageUrl(movie.posterPath, 'w342')}
                    alt={movie.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 200px"
                  />
                  <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-ns-bg/80 flex items-center justify-center">
                    <span className="text-ns-gold text-[10px] font-body font-bold">{i + 1}</span>
                  </div>
                </div>
                <p className="text-ns-muted text-xs font-body mt-2 truncate group-hover:text-ns-text transition-colors">
                  {movie.title}
                </p>
                <p className="text-ns-muted/40 text-[10px] font-body">{formatYear(movie.releaseDate)}</p>
              </Link>
            ))}
          </div>
        )}

        {/* Related collections */}
        <RelatedCollections collectionId={col.id} />

      </div>
    </div>
  )
}
