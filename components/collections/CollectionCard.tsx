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
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface ring-1 ring-inset ring-white/5">
        {collection.coverPath ? (
          <Image
            src={tmdbImageUrl(collection.coverPath, 'w342')}
            alt=""
            fill
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <CollectionsIcon size={32} className="text-ns-subtle" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
        <span className="absolute bottom-2.5 left-2.5 text-sm font-semibold tabular-nums text-white">
          {collection.movieCount} film{collection.movieCount !== 1 ? 's' : ''}
        </span>

        {!collection.isPublic && (
          <span className="absolute right-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-semibold text-white">
            Private
          </span>
        )}
      </div>

      <h3 className="mt-2.5 truncate font-heading text-base font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
        {collection.title}
      </h3>
      <p className="mt-0.5 truncate text-sm text-ns-muted">
        {isOwner ? 'My collection' : `by @${collection.username}`}
      </p>
    </Link>
  )
}
