import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPersonById, getPersonMovieCredits } from '@/services/tmdb'
import { formatYear, tmdbImageUrl } from '@/lib/utils'
import type { TMDbPersonMovieCredit } from '@/types'

interface Props {
  params: Promise<{ personId: string }>
}

function sortAndDedupeCredits(credits: TMDbPersonMovieCredit[]) {
  const seen = new Set<number>()

  return [...credits]
    .sort((a, b) => {
      const dateDifference = (Date.parse(b.release_date || '') || 0) - (Date.parse(a.release_date || '') || 0)
      return dateDifference || b.popularity - a.popularity
    })
    .filter(movie => {
      if (seen.has(movie.id)) return false
      seen.add(movie.id)
      return true
    })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { personId } = await params
  const id = Number(personId)
  if (!Number.isInteger(id) || id <= 0) return { title: 'Actor' }

  try {
    const person = await getPersonById(id)
    return {
      title: `${person.name} — Filmography`,
      description: `Browse movies featuring ${person.name}.`,
    }
  } catch {
    return { title: 'Actor' }
  }
}

export default async function ActorPage({ params }: Props) {
  const { personId } = await params
  const id = Number(personId)
  if (!Number.isInteger(id) || id <= 0) notFound()

  const [person, credits] = await Promise.all([
    getPersonById(id).catch(() => null),
    getPersonMovieCredits(id).catch(() => ({ id, cast: [] })),
  ])

  if (!person) notFound()

  const movies = sortAndDedupeCredits(credits.cast)
  const lifespan = [
    person.birthday ? formatYear(person.birthday) : null,
    person.deathday ? formatYear(person.deathday) : null,
  ].filter(Boolean).join('–')

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <Link
        href="/search"
        className="inline-flex items-center gap-2 text-xs font-body text-ns-muted hover:text-ns-secondary-readable transition-colors mb-8"
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Find another actor
      </Link>

      <section className="flex flex-col sm:flex-row gap-7 sm:gap-9 items-center sm:items-start mb-12">
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex-shrink-0 overflow-hidden rounded-full bg-ns-surface border border-ns-border shadow-2xl shadow-black/40">
          <Image
            src={tmdbImageUrl(person.profile_path, 'w342')}
            alt={person.name}
            fill
            priority
            sizes="(max-width: 640px) 144px, 176px"
            className="object-cover"
          />
        </div>

        <div className="text-center sm:text-left pt-1">
          <p className="text-ns-secondary-readable text-xs tracking-[0.22em] uppercase font-body mb-2">
            {person.known_for_department || 'Actor'}
          </p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wider text-ns-text leading-none">
            {person.name.toUpperCase()}
          </h1>

          {(lifespan || person.place_of_birth) && (
            <p className="text-ns-muted text-sm font-body mt-3">
              {[lifespan, person.place_of_birth].filter(Boolean).join(' · ')}
            </p>
          )}

          {person.biography && (
            <p className="max-w-3xl text-ns-muted text-sm font-body leading-relaxed mt-5">
              {person.biography}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="filmography-heading">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <p className="text-ns-secondary-readable text-xs tracking-[0.22em] uppercase font-body mb-1">Filmography</p>
            <h2 id="filmography-heading" className="font-heading text-2xl sm:text-3xl font-semibold text-ns-text">
              Movies featuring {person.name}
            </h2>
          </div>
          <p className="text-ns-muted text-sm font-body flex-shrink-0">
            {movies.length} {movies.length === 1 ? 'movie' : 'movies'}
          </p>
        </div>

        {movies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-7">
            {movies.map(movie => (
              <Link
                key={movie.id}
                href={`/movie/${movie.id}`}
                aria-label={`View ${movie.title}`}
                className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary
                           focus-visible:ring-offset-4 focus-visible:ring-offset-ns-bg"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface border border-ns-border
                                transition-all duration-300 group-hover:border-ns-secondary/40 group-hover:-translate-y-1">
                  <Image
                    src={tmdbImageUrl(movie.poster_path, 'w342')}
                    alt={movie.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                  {movie.vote_average > 0 && (
                    <span className="absolute top-2 right-2 rounded-md border border-ns-secondary/20 bg-ns-bg/85 px-1.5 py-0.5
                                     text-[10px] font-body font-semibold text-ns-secondary-readable backdrop-blur-sm">
                      {movie.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-body font-medium text-ns-text transition-colors group-hover:text-ns-secondary-readable">
                  {movie.title}
                </p>
                <p className="truncate text-xs font-body text-ns-muted">
                  {formatYear(movie.release_date)}{movie.character ? ` · ${movie.character}` : ''}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-ns-border bg-ns-surface px-6 py-12 text-center">
            <p className="text-sm font-body text-ns-muted">No movie credits are available for this actor yet.</p>
          </div>
        )}
      </section>
    </div>
  )
}
