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
    <Link href={`/collections/${collection.id}`} className="group block min-w-0">
      {/* Cover */}
      <div className="relative mb-3 aspect-[2/3] overflow-hidden rounded border border-ns-border bg-ns-surface transition-colors group-hover:border-ns-text/60">
        {collection.coverPath ? (
          <Image
            src={tmdbImageUrl(collection.coverPath, 'w342')}
            alt={collection.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <CollectionsIcon size={40} className="text-ns-muted/30" />
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="truncate font-body text-sm font-medium text-ns-text transition-colors group-hover:text-ns-secondary-readable">
        {collection.title}
      </h3>
      <p className="mt-0.5 font-body text-xs text-ns-muted">
        {isOwner ? 'My collection' : `by @${collection.username}`}
      </p>
      <p className="mt-0.5 font-body text-xs text-ns-muted">
        {collection.movieCount} film{collection.movieCount !== 1 ? 's' : ''}
        {!collection.isPublic && ' · Private'}
      </p>
    </Link>
  )
}
