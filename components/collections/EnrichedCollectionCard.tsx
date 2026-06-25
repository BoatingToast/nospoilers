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

function scoreColor(score: number) {
  if (score > 20)  return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
  if (score > 0)   return 'text-ns-gold border-ns-gold/30 bg-ns-gold/10'
  if (score === 0) return 'text-ns-muted border-ns-border bg-ns-surface'
  return 'text-red-400 border-red-500/30 bg-red-500/10'
}

export default function EnrichedCollectionCard({
  collection,
  isOwner  = false,
  showVotes = true,
  rank,
}: Props) {
  return (
    <div className="group flex flex-col">
      {/* Poster + cover */}
      <Link href={`/collections/${collection.id}`} className="block relative mb-3">
        <div className="aspect-[2/3] rounded-xl overflow-hidden bg-ns-surface border border-ns-border
                        group-hover:border-ns-gold/30 transition-all duration-300
                        group-hover:shadow-[0_0_20px_rgba(200,150,62,0.08)] relative">
          {collection.coverPath ? (
            <Image
              src={tmdbImageUrl(collection.coverPath, 'w342')}
              alt={collection.title}
              fill
              className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <CollectionsIcon size={44} className="text-ns-muted/20" />
            </div>
          )}

          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-ns-bg/90 via-ns-bg/20 to-transparent" />

          {/* Rank badge */}
          {rank !== undefined && (
            <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-ns-bg/85 backdrop-blur-sm
                            flex items-center justify-center border border-ns-gold/30">
              <span className="text-ns-gold text-[11px] font-body font-bold">#{rank}</span>
            </div>
          )}

          {/* Score badge */}
          {collection.score !== 0 && (
            <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full border text-[10px] font-body font-semibold
                             ${scoreColor(collection.score)}`}>
              {collection.score > 0 ? '+' : ''}{collection.score}
            </div>
          )}

          {!collection.isPublic && (
            <div className="absolute top-2 right-2">
              <span className="bg-ns-bg/80 text-ns-muted text-[9px] font-body px-1.5 py-0.5 rounded-full border border-ns-border">
                Private
              </span>
            </div>
          )}

          {/* Film count bottom-left */}
          <div className="absolute bottom-3 left-3">
            <span className="text-ns-gold text-xs font-body font-medium">
              {collection.movieCount} film{collection.movieCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </Link>

      {/* Info */}
      <Link href={`/collections/${collection.id}`}>
        <h3 className="text-ns-text text-sm font-body font-semibold truncate group-hover:text-ns-gold transition-colors leading-tight mb-0.5">
          {collection.title}
        </h3>
      </Link>

      <p className="text-ns-muted text-xs font-body mb-1.5">
        {isOwner ? 'My collection' : `by @${collection.username}`}
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
