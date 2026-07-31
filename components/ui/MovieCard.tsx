import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear, formatRating } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { TMDbMovie } from '@/types'

interface MovieCardProps {
  movie: TMDbMovie
  size?: 'sm' | 'md' | 'lg'
  showRating?: boolean
}

export default function MovieCard({ movie, size = 'md', showRating = true }: MovieCardProps) {
  const widths  = { sm: 120, md: 185, lg: 280 }
  const heights = { sm: 180, md: 278, lg: 420 }

  return (
    <Link
      href={`/movie/${movie.id}`}
      aria-label={`View ${movie.title}`}
      className="group relative block flex-shrink-0 snap-start rounded-xl
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary
                 focus-visible:ring-offset-4 focus-visible:ring-offset-ns-bg"
      style={{ width: widths[size] }}
    >

      <Card
        interactive
        className="relative overflow-hidden rounded-xl group-hover:scale-[1.02] group-focus-visible:scale-[1.02]"
        style={{ width: widths[size], height: heights[size] }}
      >
        <Image
          src={tmdbImageUrl(movie.poster_path, 'w342')}
          alt={movie.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes={`${widths[size]}px`}
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-ns-bg via-ns-bg/40 to-transparent
                        opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100
                        transition-opacity duration-300 p-3 flex flex-col justify-end">
          <p className="text-ns-text text-xs font-semibold font-body line-clamp-2 leading-tight">
            {movie.title}
          </p>
          <p className="text-ns-muted text-xs font-body mt-0.5">
            {formatYear(movie.release_date)}
          </p>
        </div>
      </Card>

      {showRating && movie.vote_average > 0 && (
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 bg-ns-bg/80 backdrop-blur-sm rounded-md"
        >
          {formatRating(movie.vote_average)}
        </Badge>
      )}

      <div className="mt-2 min-w-0">
        <p className="truncate text-sm font-heading font-semibold text-ns-text transition-colors group-hover:text-white">
          {movie.title}
        </p>
        <p className="mt-0.5 text-xs font-body text-ns-muted">
          {formatYear(movie.release_date)}
        </p>
      </div>
    </Link>
  )
}
