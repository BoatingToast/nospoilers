import Link from 'next/link'
import PosterImage from '@/components/discover/PosterImage'
import PosterRail from '@/components/discover/PosterRail'
import { formatYear } from '@/lib/utils'
import type { RelatedMovieMatch } from '@/lib/movie-quality'

export default function SimilarMovies({ matches }: { matches: RelatedMovieMatch[] }) {
  if (matches.length === 0) return null

  return (
    <section aria-labelledby="related-films-heading" className="ns-reveal">
      <PosterRail
        label="Related films"
        controlsLabel="related films"
        heading={(
          <>
            <h2 id="related-films-heading" className="font-display text-3xl text-ns-text sm:text-4xl">
              Related films
            </h2>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-ns-muted">
              Ranked from TMDb recommendations and similar-film results, then filtered for shared genres and audience confidence.
            </p>
          </>
        )}
      >
        {matches.map(({ movie, reason }) => (
          <Link
            key={movie.id}
            href={`/movie/${movie.id}`}
            aria-label={`View ${movie.title}: ${reason}`}
            className="group block w-40 flex-shrink-0 snap-start rounded-xl sm:w-44"
          >
            <span className="relative block aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface ring-1 ring-inset ring-white/5">
              <PosterImage path={movie.poster_path} sizes="176px" className="transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none" />
            </span>
            <span className="mt-2.5 block truncate font-heading text-base font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
              {movie.title}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-sm tabular-nums text-ns-muted">
              <span>{formatYear(movie.release_date)}</span>
              {movie.vote_average > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{movie.vote_average.toFixed(1)}</span>
                </>
              )}
            </span>
            <span className="mt-1.5 line-clamp-2 text-sm leading-snug text-ns-subtle">{reason}</span>
          </Link>
        ))}
      </PosterRail>
    </section>
  )
}
