import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Section from '@/components/ui/Section'
import type { RelatedMovieMatch } from '@/lib/movie-quality'

export default function SimilarMovies({ matches }: { matches: RelatedMovieMatch[] }) {
  if (matches.length === 0) return null

  return (
    <Section
      headingId="related-films-heading"
      title="Related films"
      note="Ranked from TMDb recommendations and similar-film results, then filtered for shared genres and audience confidence."
    >
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 scrollbar-hide sm:-mx-6 sm:px-6">
        {matches.map(({ movie, reason }) => (
          <Link
            key={movie.id}
            href={`/movie/${movie.id}`}
            aria-label={`View ${movie.title}: ${reason}`}
            className="group w-[140px] flex-shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary focus-visible:ring-offset-4 focus-visible:ring-offset-ns-bg"
          >
            <Card interactive className="relative h-[210px] w-[140px] overflow-hidden group-hover:border-ns-text/60">
              <Image
                src={tmdbImageUrl(movie.poster_path, 'w185')}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="140px"
              />
              {movie.vote_average > 0 && (
                <Badge variant="secondary" className="absolute right-1.5 top-1.5 bg-ns-bg/90">
                  {movie.vote_average.toFixed(1)}
                </Badge>
              )}
            </Card>
            <p className="mt-2 truncate font-heading text-sm font-semibold text-ns-text transition-colors group-hover:text-ns-secondary-readable">
              {movie.title}
            </p>
            <p className="mt-0.5 font-body text-xs text-ns-muted">{formatYear(movie.release_date)}</p>
            <p className="mt-1 line-clamp-2 font-body text-xs leading-snug text-ns-secondary-readable/80">
              {reason}
            </p>
          </Link>
        ))}
      </div>
    </Section>
  )
}
