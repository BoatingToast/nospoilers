import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import type { CollectionData } from '@/types'
import { CollectionsIcon } from '@/components/icons'

interface Props {
  collection: CollectionData
  isOwner?:   boolean
}

export default function CollectionCard({ collection, isOwner }: Props) {
  return (
    <Link href={`/collections/${collection.id}`} className="group block">
      {/* Cover */}
      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-ns-surface border border-ns-border relative mb-3">
        {collection.coverPath ? (
          <Image
            src={tmdbImageUrl(collection.coverPath, 'w342')}
            alt={collection.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300 opacity-70"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <CollectionsIcon size={40} className="text-ns-muted/30" />
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-ns-bg/90 via-ns-bg/20 to-transparent" />

        {/* Movie count badge */}
        <div className="absolute bottom-3 left-3">
          <span className="text-ns-gold text-xs font-body font-medium">
            {collection.movieCount} film{collection.movieCount !== 1 ? 's' : ''}
          </span>
        </div>

        {!collection.isPublic && (
          <div className="absolute top-2 right-2">
            <span className="bg-ns-bg/80 text-ns-muted text-[9px] font-body px-1.5 py-0.5 rounded-full border border-ns-border">
              Private
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="text-ns-text text-sm font-body font-medium truncate group-hover:text-ns-gold transition-colors">
        {collection.title}
      </h3>
      <p className="text-ns-muted text-xs font-body mt-0.5">
        {isOwner ? 'My collection' : `by @${collection.username}`}
      </p>
    </Link>
  )
}
