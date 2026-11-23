import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import { FilmIcon } from '@/components/icons'

export const posterGridClass = 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'

export default function PosterTile({
  tmdbId,
  title,
  posterPath,
  meta,
  overlay,
  index,
}: {
  tmdbId: number
  title: string
  posterPath: string | null
  meta?: string
  overlay?: React.ReactNode
  index: number
}) {
  return (
    <Link
      href={`/movie/${tmdbId}`}
      className="ns-reveal group block min-w-0 rounded-xl"
      style={{ '--i': Math.min(index, 7) } as React.CSSProperties}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface">
        {posterPath ? (
          <Image
            src={tmdbImageUrl(posterPath, 'w342')}
            alt=""
            fill
            sizes="(min-width: 1024px) 230px, (min-width: 640px) 30vw, 46vw"
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FilmIcon size={32} className="text-ns-muted" />
          </div>
        )}
        {overlay}
      </div>
      <p className="mt-2.5 truncate font-heading text-base font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
        {title}
      </p>
      {meta && <p className="mt-0.5 text-sm text-ns-muted">{meta}</p>}
    </Link>
  )
}
