'use client'

import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import type { RecPersona } from '@/types'
import { RecsIcon, FilmIcon } from '@/components/icons'

interface Props {
  personas: RecPersona[]
}

export default function RecPersonaSection({ personas }: Props) {
  if (personas.length === 0) return null

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-heading text-white flex items-center gap-2">
          <RecsIcon size={18} className="text-ns-gold" /> Curated Themes For You
        </h2>
        <p className="text-xs font-body text-ns-muted mt-1">
          Dynamically generated from your favorites and taste DNA
        </p>
      </div>

      <div className="space-y-6">
        {personas.map(persona => (
          <PersonaGroup key={persona.id} persona={persona} />
        ))}
      </div>
    </section>
  )
}

function PersonaGroup({ persona }: { persona: RecPersona }) {
  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl overflow-hidden">
      {/* Persona header */}
      <div className="px-5 py-4 border-b border-ns-border flex items-center gap-3">
        <RecsIcon size={18} className="text-ns-gold/70 flex-shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm font-heading text-white leading-tight truncate">
            {persona.title}
          </h3>
          <p className="text-[11px] font-body text-ns-muted mt-0.5">
            {persona.description}
          </p>
        </div>
      </div>

      {/* Movie row */}
      <div className="flex gap-3 overflow-x-auto p-4 scrollbar-hide">
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
      className="flex-shrink-0 w-28 group"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 border border-ns-border group-hover:border-ns-gold/50 transition-colors">
        {img ? (
          <Image
            src={img}
            alt={movie.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="112px"
          />
        ) : (
          <div className="absolute inset-0 bg-ns-border flex items-center justify-center">
            <FilmIcon size={28} className="text-ns-muted/40" />
          </div>
        )}
        {/* Match score badge */}
        <div className="absolute top-1.5 left-1.5 text-[9px] font-mono font-bold bg-black/80 text-ns-gold px-1.5 py-0.5 rounded-md border border-ns-gold/30">
          {movie.matchScore}%
        </div>
      </div>

      {/* Title */}
      <p className="text-[11px] font-body text-ns-text leading-tight line-clamp-2 group-hover:text-white transition-colors">
        {movie.title}
      </p>
      {movie.releaseDate && (
        <p className="text-[10px] font-body text-ns-muted mt-0.5">
          {movie.releaseDate.slice(0, 4)}
        </p>
      )}
    </Link>
  )
}
