import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import type { RelatedMovieMatch } from '@/lib/movie-quality'

export default function SimilarMovies({ matches }: { matches: RelatedMovieMatch[] }) {
  if (matches.length === 0) return null

  return (
    <section aria-labelledby="related-films-heading" className="mb-10">
      <div className="mb-4">
        <p id="related-films-heading" className="text-xs font-body uppercase tracking-widest text-ns-muted">
          Related films
        </p>
        <p className="mt-1 max-w-xl text-[10px] font-body leading-relaxed text-ns-muted/60">
          Ranked from TMDb recommendations and similar-film results, then filtered for shared genres and audience confidence.
        </p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-6 px-6">
        {matches.map(({ movie, reason }) => (
          <Link
            key={movie.id}
            href={`/movie/${movie.id}`}
            aria-label={`View ${movie.title}: ${reason}`}
            className="group flex-shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary focus-visible:ring-offset-4 focus-visible:ring-offset-ns-bg"
          >
            <div className="w-[130px]">
              <div className="relative w-[130px] h-[195px] rounded-xl overflow-hidden bg-ns-surface border border-ns-border
                              transition-all duration-300 group-hover:border-ns-secondary/30 group-hover:scale-[1.02]">
                <Image
                  src={tmdbImageUrl(movie.poster_path, 'w185')}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="130px"
                />
                {movie.vote_average > 0 && (
                  <div className="absolute top-1.5 right-1.5 bg-ns-bg/80 backdrop-blur-sm rounded px-1 py-0.5
                                  text-ns-secondary-readable text-[10px] font-body font-semibold border border-ns-secondary/20">
                    {movie.vote_average.toFixed(1)}
                  </div>
                )}
              </div>
              <p className="text-ns-muted text-[11px] font-body mt-1.5 truncate leading-tight">
                {movie.title}
              </p>
              <p className="text-ns-muted/50 text-[10px] font-body">{formatYear(movie.release_date)}</p>
              <p className="mt-1 line-clamp-2 text-[9px] font-body leading-snug text-ns-secondary-readable/80">
                {reason}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
