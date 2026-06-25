import Image from 'next/image'
import { tmdbImageUrl, formatYear, formatRating } from '@/lib/utils'
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
    <div className="group relative flex-shrink-0 cursor-pointer">
      <div
        className="relative overflow-hidden rounded-xl bg-ns-surface border border-ns-border
                   transition-all duration-300 group-hover:border-ns-gold/30 group-hover:scale-[1.02]
                   group-hover:shadow-[0_0_30px_rgba(200,150,62,0.15)]"
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
                        opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 flex flex-col justify-end">
          <p className="text-ns-text text-xs font-semibold font-body line-clamp-2 leading-tight">
            {movie.title}
          </p>
          <p className="text-ns-muted text-xs font-body mt-0.5">
            {formatYear(movie.release_date)}
          </p>
        </div>
      </div>

      {showRating && movie.vote_average > 0 && (
        <div className="absolute top-2 right-2 bg-ns-bg/80 backdrop-blur-sm rounded-md px-1.5 py-0.5
                        text-ns-gold text-xs font-semibold font-body border border-ns-gold/20">
          {formatRating(movie.vote_average)}
        </div>
      )}
    </div>
  )
}
