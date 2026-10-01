'use client'

import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import VoteButtons from './VoteButtons'
import Badge from '@/components/ui/Badge'
import type { EnrichedCollectionData } from '@/types'
import { CollectionsIcon } from '@/components/icons'

interface Props {
  collection: EnrichedCollectionData
  isOwner?:   boolean
  showVotes?: boolean
  rank?:      number   // for trending list
}

function scoreVariant(score: number) {
  if (score > 20)  return 'success' as const
  if (score > 0)   return 'secondary' as const
  if (score === 0) return 'muted' as const
  return 'danger' as const
}

export default function EnrichedCollectionCard({
  collection,
  isOwner  = false,
  showVotes = true,
  rank,
}: Props) {
  return (
    <div className="group flex min-w-0 flex-col">
      {/* Cover */}
      <Link href={`/collections/${collection.id}`} className="relative mb-3 block">
        <div className="relative aspect-[2/3] overflow-hidden rounded border border-ns-border bg-ns-surface transition-colors group-hover:border-ns-text/60">
          {collection.coverPath ? (
            <Image
              src={tmdbImageUrl(collection.coverPath, 'w342')}
              alt={collection.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <CollectionsIcon size={44} className="text-ns-muted/20" />
            </div>
          )}

          {/* Rank tag */}
          {rank !== undefined && (
            <span className="absolute left-0 top-0 bg-ns-bg px-1.5 py-0.5 font-body text-[11px] font-bold text-ns-secondary-readable">
              #{rank}
            </span>
          )}
        </div>
      </Link>

      {/* Info */}
      <Link href={`/collections/${collection.id}`}>
        <h3 className="mb-0.5 truncate font-body text-sm font-semibold leading-tight text-ns-text transition-colors group-hover:text-ns-secondary-readable">
          {collection.title}
        </h3>
      </Link>

      <p className="font-body text-xs text-ns-muted">
        {isOwner ? 'My collection' : `by @${collection.username}`}
      </p>
      <p className="mb-2 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-body text-xs text-ns-muted">
        <span>
          {collection.movieCount} film{collection.movieCount !== 1 ? 's' : ''}
          {!collection.isPublic && ' · Private'}
        </span>
        {collection.score !== 0 && (
          <Badge variant={scoreVariant(collection.score)}>
            {collection.score > 0 ? '+' : ''}{collection.score}
          </Badge>
        )}
      </p>

      {/* Vote row */}
      {showVotes && (
        <div className="mt-auto">
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
