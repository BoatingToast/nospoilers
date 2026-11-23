import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPersonById, getPersonMovieCredits } from '@/services/tmdb'
import { formatYear, tmdbImageUrl } from '@/lib/utils'
import PosterImage from '@/components/discover/PosterImage'
import type { TMDbPersonMovieCredit } from '@/types'
import { parseCatalogId, publicPageMetadata } from '@/lib/seo'
import PosterTile from '@/components/discover/PosterTile'
import ExpandableText from '@/components/movie/ExpandableText'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'

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
  const id = parseCatalogId(personId)
  if (id === null) notFound()

  try {
    const person = await getPersonById(id)
    return publicPageMetadata({
      title: `${person.name} Movies & Filmography`,
      description: `Explore movies featuring ${person.name}. Browse their filmography and find your next film with spoiler controls on NoSpoilers.`,
      path: `/actor/${id}`,
      image: person.profile_path ? { url: tmdbImageUrl(person.profile_path, 'w500'), alt: person.name } : undefined,
    })
  } catch {
    return { title: 'Person not found', robots: { index: false, follow: true } }
  }
}

export default async function ActorPage({ params }: Props) {
  const { personId } = await params
  const id = parseCatalogId(personId)
  if (id === null) notFound()

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
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6 lg:pb-24">
      <Link
        href="/search"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ns-muted transition-colors hover:text-ns-text"
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Find another actor
      </Link>

      <section className="grid gap-7 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-14">
        <div className="relative aspect-[2/3] w-44 overflow-hidden rounded-xl bg-ns-surface shadow-2xl ring-1 ring-inset ring-white/5 sm:w-full">
          <PosterImage
            path={person.profile_path}
            alt={person.name}
            preload
            fallback="person"
            sizes="(min-width: 1024px) 272px, 192px"
          />
        </div>

        <div className="min-w-0 lg:pt-2">
          <p className="text-base font-medium text-ns-secondary-readable">
            {person.known_for_department || 'Actor'}
          </p>
          <h1 className="mt-2 break-words font-display text-5xl text-ns-text sm:text-6xl lg:text-7xl">
            {person.name}
          </h1>

          {(lifespan || person.place_of_birth) && (
            <p className="mt-4 text-base tabular-nums text-ns-muted">
              {[lifespan, person.place_of_birth].filter(Boolean).join(' · ')}
            </p>
          )}

          {person.biography && (
            <ExpandableText text={person.biography} className="mt-5 max-w-2xl" />
          )}
        </div>
      </section>

      <section aria-labelledby="filmography-heading" className="mt-14 lg:mt-20">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="filmography-heading" className="min-w-0 break-words font-display text-3xl text-ns-text sm:text-4xl">
            Movies featuring {person.name}
          </h2>
          <p className="flex-shrink-0 text-base tabular-nums text-ns-muted">
            {movies.length} {movies.length === 1 ? 'movie' : 'movies'}
          </p>
        </div>

        {movies.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {movies.map((movie, index) => (
              <div key={movie.id} className="ns-reveal min-w-0" style={{ '--i': index % 6 } as React.CSSProperties}>
                <PosterTile
                  href={`/movie/${movie.id}`}
                  title={movie.title}
                  posterPath={movie.poster_path}
                  meta={`${formatYear(movie.release_date)}${movie.character ? ` · ${movie.character}` : ''}`}
                  rating={movie.vote_average}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No credits yet"
            description="No movie credits are available for this actor yet."
            action={<Button variant="outline" href="/search">Find another actor</Button>}
          />
        )}
      </section>
    </div>
  )
}
