'use client'

import PosterRail from '@/components/discover/PosterRail'
import PosterTile from '@/components/discover/PosterTile'
import type { RecPersona } from '@/types'

interface Props {
  personas: RecPersona[]
}

export default function RecPersonaSection({ personas }: Props) {
  if (personas.length === 0) return null

  return (
    <section aria-labelledby="curated-themes-title">
      <div className="ns-reveal mb-8">
        <h2 id="curated-themes-title" className="font-display text-3xl text-ns-text sm:text-4xl">
          Curated themes for you
        </h2>
        <p className="mt-1.5 text-base text-ns-muted">
          Dynamically generated from your favorites and taste DNA
        </p>
      </div>

      <div className="space-y-10">
        {personas.map(persona => (
          <div key={persona.id} className="ns-reveal">
            <PosterRail
              label={`${persona.title} films`}
              controlsLabel={persona.title}
              heading={(
                <>
                  <h3 className="font-heading text-xl font-bold text-ns-text">{persona.title}</h3>
                  <p className="mt-0.5 text-sm text-ns-muted">{persona.description}</p>
                </>
              )}
            >
              {persona.movies.map(movie => (
                <div key={movie.tmdbId} className="w-36 flex-shrink-0 snap-start">
                  <PosterTile
                    href={`/movie/${movie.tmdbId}`}
                    title={movie.title}
                    posterPath={movie.posterPath}
                    meta={movie.releaseDate?.slice(0, 4)}
                    badge={`${movie.matchScore}%`}
                    sizes="144px"
                  />
                </div>
              ))}
            </PosterRail>
          </div>
        ))}
      </div>
    </section>
  )
}
