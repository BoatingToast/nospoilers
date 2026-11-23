import MovieCard from '@/components/ui/MovieCard'
import PosterRail from './PosterRail'
import type { TMDbMovie } from '@/types'

interface DiscoverSectionProps {
  title: string
  description?: string
  movies: TMDbMovie[]
}

/**
 * Cards render on the server and pass into the client rail as children, so
 * movie overviews never reach the browser from this page.
 */
export default function DiscoverSection({ title, description, movies }: DiscoverSectionProps) {
  if (movies.length === 0) return null

  const headingId = `rail-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <section aria-labelledby={headingId} className="ns-reveal scroll-mt-24">
      <PosterRail
        label={`${title} films`}
        controlsLabel={title}
        heading={(
          <>
            <h2 id={headingId} className="font-display text-3xl text-ns-text sm:text-4xl">{title}</h2>
            {description && <p className="mt-1.5 text-base text-ns-muted">{description}</p>}
          </>
        )}
      >
        {movies.map(movie => <MovieCard key={movie.id} movie={movie} />)}
      </PosterRail>
    </section>
  )
}
