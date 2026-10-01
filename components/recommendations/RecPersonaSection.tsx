'use client'

import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import type { RecPersona } from '@/types'
import Section from '@/components/ui/Section'
import { FilmIcon } from '@/components/icons'

interface Props {
  personas: RecPersona[]
}

export default function RecPersonaSection({ personas }: Props) {
  if (personas.length === 0) return null

  return (
    <Section title="Curated Themes For You" note="Dynamically generated from your favorites and taste DNA">
      <div className="border-b border-ns-border">
        {personas.map(persona => (
          <PersonaGroup key={persona.id} persona={persona} />
        ))}
      </div>
    </Section>
  )
}

function PersonaGroup({ persona }: { persona: RecPersona }) {
  return (
    <div className="grid min-w-0 gap-4 border-t border-ns-border py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.5fr)] lg:gap-10">
      {/* Persona header */}
      <div className="min-w-0">
        <h3 className="font-heading text-base font-semibold leading-tight text-ns-text">
          {persona.title}
        </h3>
        <p className="mt-1 font-body text-xs leading-relaxed text-ns-muted">
          {persona.description}
        </p>
      </div>

      {/* Movie row */}
      <div className="scrollbar-hide flex min-w-0 gap-3 overflow-x-auto pb-1">
        {persona.movies.map(m => (
          <PersonaMovieCard key={m.tmdbId} movie={m} />
        ))}
      </div>
    </div>
  )
}

function PersonaMovieCard({ movie }: { movie: RecPersona['movies'][number] }) {
  const img = tmdbImageUrl(movie.posterPath, 'w185')

  return (
    <Link
      href={`/movie/${movie.tmdbId}`}
      className="group w-28 flex-shrink-0"
    >
      {/* Poster */}
      <div className="relative mb-2 aspect-[2/3] overflow-hidden rounded border border-ns-border transition-colors group-hover:border-ns-text/60">
        {img ? (
          <Image
            src={img}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="112px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-ns-surface-2">
            <FilmIcon size={28} className="text-ns-muted/40" />
          </div>
        )}
      </div>

      {/* Title */}
      <p className="font-body text-xs leading-tight text-ns-text line-clamp-2 group-hover:text-ns-secondary-readable">
        {movie.title}
      </p>
      <p className="mt-0.5 font-body text-[11px] text-ns-muted">
        <span className="font-semibold text-ns-secondary-readable">{movie.matchScore}%</span>
        {movie.releaseDate && <> · {movie.releaseDate.slice(0, 4)}</>}
      </p>
    </Link>
  )
}
