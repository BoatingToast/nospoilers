import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import type { TMDbMovie } from '@/types'

export default function SimilarMovies({ movies }: { movies: TMDbMovie[] }) {
  if (movies.length === 0) return null

  return (
    <div>
      <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-4">
        People who liked this also enjoyed
      </p>
      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-6 px-6">
        {movies.slice(0, 12).map(movie => (
          <Link key={movie.id} href={`/movie/${movie.id}`} className="group flex-shrink-0">
            <div className="w-[130px]">
              <div className="relative w-[130px] h-[195px] rounded-xl overflow-hidden bg-ns-surface border border-ns-border
                              transition-all duration-300 group-hover:border-ns-gold/30 group-hover:scale-[1.02]">
                <Image
                  src={tmdbImageUrl(movie.poster_path, 'w185')}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="130px"
                />
                {movie.vote_average > 0 && (
                  <div className="absolute top-1.5 right-1.5 bg-ns-bg/80 backdrop-blur-sm rounded px-1 py-0.5
                                  text-ns-gold text-[10px] font-body font-semibold border border-ns-gold/20">
                    {movie.vote_average.toFixed(1)}
                  </div>
                )}
              </div>
              <p className="text-ns-muted text-[11px] font-body mt-1.5 truncate leading-tight">
                {movie.title}
              </p>
              <p className="text-ns-muted/50 text-[10px] font-body">{formatYear(movie.release_date)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
