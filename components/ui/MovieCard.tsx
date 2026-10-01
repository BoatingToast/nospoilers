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
      className="group relative block flex-shrink-0 snap-start rounded
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary
                 focus-visible:ring-offset-4 focus-visible:ring-offset-ns-bg"
      style={{ width: widths[size] }}
    >

      <Card
        interactive
        className="relative overflow-hidden group-hover:border-ns-text/60 group-focus-visible:border-ns-text/60"
        style={{ width: widths[size], height: heights[size] }}
      >
        <Image
          src={tmdbImageUrl(movie.poster_path, 'w342')}
          alt={movie.title}
          fill
          className="object-cover"
          sizes={`${widths[size]}px`}
        />
      </Card>

      {showRating && movie.vote_average > 0 && (
        <Badge
          variant="secondary"
          className="absolute right-2 top-2 bg-ns-bg/90"
        >
          {formatRating(movie.vote_average)}
        </Badge>
      )}

      <div className="mt-2 min-w-0">
        <p className="truncate text-sm font-heading font-semibold text-ns-text transition-colors group-hover:text-ns-secondary-readable">
          {movie.title}
        </p>
        <p className="mt-0.5 text-xs font-body text-ns-muted">
          {formatYear(movie.release_date)}
        </p>
      </div>
    </Link>
  )
}
