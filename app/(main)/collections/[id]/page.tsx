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
import PageHeader         from '@/components/ui/PageHeader'
import Badge              from '@/components/ui/Badge'
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

  const stats: string[] = [`${col.movieCount} film${col.movieCount !== 1 ? 's' : ''}`]
  if (views > 0) stats.push(`${views.toLocaleString()} view${views !== 1 ? 's' : ''}`)
  if (upvotes > 0 || downvotes > 0) {
    stats.push(`▲ ${upvotes}`)
    if (downvotes > 0) stats.push(`▼ ${downvotes}`)
    stats.push(`Score: ${score > 0 ? '+' : ''}${score}`)
  }
  if (popScore > 0) stats.push(`${popScore.toFixed(1)} popularity`)

  return (
    <div className="min-h-screen pb-20">
      <div className="mx-auto min-w-0 max-w-6xl px-4 sm:px-6">

        {/* Back */}
        <Link href="/collections"
          className="mb-6 inline-flex min-h-10 items-center gap-2 font-body text-sm text-ns-muted underline-offset-4 hover:text-ns-text hover:underline">
          ← Collections
        </Link>

        <PageHeader
          title={col.title.toUpperCase()}
          lede={
            <>
              <p className="flex flex-wrap items-center gap-2">
                <span>
                  by{' '}
                  <Link href={`/profile/${col.username}`}
                    className="text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text">
                    @{col.username}
                  </Link>
                </span>
                {!col.isPublic && <Badge variant="outline">Private</Badge>}
              </p>
              {col.description && (
                <p className="mt-2 text-sm leading-relaxed text-ns-muted">{col.description}</p>
              )}
              <p className="mt-3 text-sm text-ns-muted">{stats.join(' · ')}</p>
            </>
          }
        >
          {/* Actions — owner vs visitor */}
          {isOwner ? (
            <OwnerCollectionActions
              collectionId={col.id}
              title={col.title}
              description={col.description}
              isPublic={col.isPublic}
              movies={col.movies}
            />
          ) : (
            <>
              <VoteButtons
                collectionId={col.id}
                ownerId={col.userId}
                initialVotes={{ upvotes, downvotes, score }}
                initialVote={userVote}
              />
              {myId && (
                <VisitorCollectionActions
                  collectionId={col.id}
                  collectionTitle={col.title}
                  ownerUsername={col.username}
                  isFollowingOwner={!!followRow}
                  isFriendWithOwner={!!friendRow}
                />
              )}
            </>
          )}
        </PageHeader>

        {/* Movies grid */}
        <div className="mt-8">
          {col.movies.length === 0 ? (
            isOwner
              ? <EmptyCollectionCTA />
              : (
                <p className="border-t border-ns-border py-8 font-body text-sm text-ns-muted">
                  No movies in this collection yet.
                </p>
              )
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-5">
              {col.movies.map((movie, i) => (
                <Link key={movie.tmdbId} href={`/movie/${movie.tmdbId}`} className="group min-w-0">
                  <div className="relative aspect-[2/3] overflow-hidden rounded border border-ns-border bg-ns-surface transition-colors group-hover:border-ns-text/60">
                    <Image
                      src={tmdbImageUrl(movie.posterPath, 'w342')}
                      alt={movie.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 200px"
                    />
                    <span className="absolute left-0 top-0 bg-ns-bg px-1.5 py-0.5 font-body text-[11px] font-bold text-ns-secondary-readable">
                      {i + 1}
                    </span>
                  </div>
                  <p className="mt-2 truncate font-body text-xs text-ns-muted transition-colors group-hover:text-ns-text">
                    {movie.title}
                  </p>
                  <p className="font-body text-[11px] text-ns-muted">{formatYear(movie.releaseDate)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Related collections */}
        <RelatedCollections collectionId={col.id} />

      </div>
    </div>
  )
}
