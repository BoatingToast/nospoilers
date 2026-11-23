'use client'

import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import VoteButtons from './VoteButtons'
import type { EnrichedCollectionData } from '@/types'
import { CollectionsIcon } from '@/components/icons'

interface Props {
  collection: EnrichedCollectionData
  isOwner?:   boolean
  showVotes?: boolean
  rank?:      number   // for trending list
}

export default function EnrichedCollectionCard({
  collection,
  isOwner  = false,
  showVotes = true,
  rank,
}: Props) {
  return (
    <div className="group flex h-full min-w-0 flex-col">
      <Link href={`/collections/${collection.id}`} aria-label={`View ${collection.title}`} className="block min-w-0">
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface ring-1 ring-inset ring-white/5">
          {collection.coverPath ? (
            <Image
              src={tmdbImageUrl(collection.coverPath, 'w342')}
              alt=""
              fill
              className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center">
              <CollectionsIcon size={32} className="text-ns-subtle" />
            </span>
          )}

          <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />

          {rank !== undefined && (
            <span className="absolute left-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-black/75 px-1.5 text-xs font-bold tabular-nums text-white">
              {rank}
            </span>
          )}

          {(!collection.isPublic || collection.score !== 0) && (
            <span className="absolute right-2 top-2 flex flex-col items-end gap-1">
              {!collection.isPublic && (
                <span className="rounded-full bg-black/75 px-2 py-0.5 text-xs font-semibold text-white">Private</span>
              )}
              {collection.score !== 0 && (
                <span className="rounded-full bg-black/75 px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                  {collection.score > 0 ? '+' : ''}{collection.score}
                </span>
              )}
            </span>
          )}

          <span className="absolute bottom-2.5 left-2.5 text-sm font-semibold tabular-nums text-white">
            {collection.movieCount} film{collection.movieCount !== 1 ? 's' : ''}
          </span>
        </div>
        <h3 className="mt-2.5 truncate font-heading text-base font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
          {collection.title}
        </h3>
      </Link>

      <p className="mt-0.5 truncate text-sm text-ns-muted">
        {isOwner ? 'My collection' : `by @${collection.username}`}
      </p>

      {showVotes && (
        <div className="mt-auto pt-2">
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
      )}
    </div>
  )
}
