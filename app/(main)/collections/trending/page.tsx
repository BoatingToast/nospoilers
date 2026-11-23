import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTrendingCollections } from '@/services/collection-community'
import BackLink from '@/components/collections/BackLink'
import EnrichedCollectionCard from '@/components/collections/EnrichedCollectionCard'
import VoteButtons from '@/components/collections/VoteButtons'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { CollectionsIcon } from '@/components/icons'
import { tmdbImageUrl } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import type { EnrichedCollectionData } from '@/types'

export const metadata: Metadata = { title: 'Trending Collections — NoSpoilers' }

// Revalidate every 5 minutes so trending stays fresh
export const revalidate = 300

function TopCollection({ collection, rank }: { collection: EnrichedCollectionData; rank: number }) {
  return (
    <article className="group flex gap-4 rounded-2xl bg-ns-surface p-4">
      <Link
        href={`/collections/${collection.id}`}
        aria-label={`View ${collection.title}`}
        className="relative aspect-[2/3] w-28 flex-shrink-0 overflow-hidden rounded-xl bg-ns-surface-2 sm:w-24 lg:w-32"
      >
        {collection.coverPath ? (
          <Image
            src={tmdbImageUrl(collection.coverPath, 'w342')}
            alt=""
            fill
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
            sizes="128px"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <CollectionsIcon size={28} className="text-ns-subtle" />
          </span>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-display text-5xl tabular-nums text-ns-secondary-readable">
          <span className="sr-only">Rank </span>{rank}
        </p>
        <Link href={`/collections/${collection.id}`} tabIndex={-1} className="flex min-h-11 items-center">
          <h2 className="line-clamp-2 font-heading text-lg font-bold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
            {collection.title}
          </h2>
        </Link>
        <p className="mt-0.5 truncate text-sm text-ns-muted">
          by @{collection.username} · {collection.movieCount} film{collection.movieCount !== 1 ? 's' : ''}
        </p>
        <div className="mt-auto pt-3">
          <VoteButtons
            collectionId={collection.id}
            ownerId={collection.userId}
            initialVotes={{
              upvotes:   collection.upvotes,
              downvotes: collection.downvotes,
              score:     collection.score,
            }}
            initialVote={collection.userVote}
            compact
          />
        </div>
      </div>
    </article>
  )
}

export default async function TrendingCollectionsPage() {
  const session     = await getServerSession(authOptions)
  const collections = await getTrendingCollections(session?.user?.id, 48)
  const leaders     = collections.length >= 3 ? collections.slice(0, 3) : []
  const rest        = collections.length >= 3 ? collections.slice(3) : collections

  return (
    <div className="mx-auto min-h-dvh max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:pt-10">
      <BackLink href="/collections">Collections</BackLink>
      <PageHeader
        className="mb-10 mt-4"
        title="Trending."
        description="Ranked by upvote confidence score + recent activity"
      />

      {collections.length === 0 ? (
        <EmptyState
          title="No trending collections yet."
          description="Start a list and it could be the first one here."
          action={<Button href="/collections/new">Create the first one</Button>}
        />
      ) : (
        <>
          {leaders.length > 0 && (
            <div className="mb-12 grid gap-4 md:grid-cols-3">
              {leaders.map((col, index) => (
                <TopCollection key={col.id} collection={col} rank={index + 1} />
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {rest.map((col, i) => (
                <div
                  key={col.id}
                  className={i > 5 ? 'ns-reveal' : undefined}
                  style={i > 5 ? ({ '--i': Math.min(i % 6, 7) } as CSSProperties) : undefined}
                >
                  <EnrichedCollectionCard
                    collection={col}
                    rank={i + leaders.length + 1}
                    showVotes
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
