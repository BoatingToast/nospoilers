import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear, formatRating } from '@/lib/utils'
import type { TMDbMovie } from '@/types'

interface MovieCardProps {
  movie: TMDbMovie
  size?: 'sm' | 'md' | 'lg'
  showRating?: boolean
}

const WIDTHS = { sm: 120, md: 185, lg: 280 }

export default function MovieCard({ movie, size = 'md', showRating = true }: MovieCardProps) {
  const width = WIDTHS[size]
  const year = formatYear(movie.release_date)
  const rating = showRating && movie.vote_average > 0 ? formatRating(movie.vote_average) : null

  return (
    <Link
      href={`/movie/${movie.id}`}
      aria-label={`View ${movie.title}`}
      className="group block flex-shrink-0 snap-start rounded-xl"
      style={{ width }}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface ring-1 ring-inset ring-white/5">
        <Image
          src={tmdbImageUrl(movie.poster_path, 'w342')}
          alt=""
          fill
          className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
          sizes={`${width}px`}
        />
      </div>

      <div className="mt-2.5 min-w-0">
        <p className="truncate font-heading text-base font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">{movie.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm tabular-nums text-ns-muted">
          <span>{year}</span>
          {rating && (
            <>
              <span aria-hidden="true">·</span>
              <span>{rating}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  )
}
