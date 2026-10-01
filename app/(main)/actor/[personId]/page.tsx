import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPersonById, getPersonMovieCredits } from '@/services/tmdb'
import { formatYear, tmdbImageUrl } from '@/lib/utils'
import type { TMDbPersonMovieCredit } from '@/types'
import { parseCatalogId, publicPageMetadata } from '@/lib/seo'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/ui/PageHeader'
import Section from '@/components/ui/Section'

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

  const facts = [person.known_for_department || 'Actor', lifespan, person.place_of_birth].filter(Boolean).join(' · ')

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/search"
        className="mb-6 inline-flex min-h-10 items-center gap-2 text-xs font-body text-ns-muted transition-colors hover:text-ns-secondary-readable"
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Find another actor
      </Link>

      <PageHeader
        title={person.name.toUpperCase()}
        lede={
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border border-ns-border bg-ns-surface sm:h-24 sm:w-24">
              <Image
                src={tmdbImageUrl(person.profile_path, 'w342')}
                alt={person.name}
                fill
                priority
                sizes="(max-width: 640px) 80px, 96px"
                className="object-cover"
              />
            </div>
            <p className="min-w-0">{facts}</p>
          </div>
        }
      />

      {person.biography && (
        <p className="mt-8 max-w-3xl font-body text-sm leading-relaxed text-ns-muted">
          {person.biography}
        </p>
      )}

      <Section
        headingId="filmography-heading"
        title={`Movies featuring ${person.name}`}
        note={`${movies.length} ${movies.length === 1 ? 'movie' : 'movies'}`}
        className="mt-12"
      >
        {movies.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {movies.map(movie => (
              <Link
                key={movie.id}
                href={`/movie/${movie.id}`}
                aria-label={`View ${movie.title}`}
                className="group min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary
                           focus-visible:ring-offset-4 focus-visible:ring-offset-ns-bg"
              >
                <Card interactive className="relative aspect-[2/3] overflow-hidden group-hover:border-ns-text/60">
                  <Image
                    src={tmdbImageUrl(movie.poster_path, 'w342')}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                  {movie.vote_average > 0 && (
                    <Badge variant="secondary" className="absolute right-2 top-2 bg-ns-bg/90">
                      {movie.vote_average.toFixed(1)}
                    </Badge>
                  )}
                </Card>
                <p className="mt-2 truncate text-sm font-heading font-semibold text-ns-text transition-colors group-hover:text-ns-secondary-readable">
                  {movie.title}
                </p>
                <p className="mt-0.5 truncate text-xs font-body text-ns-muted">
                  {formatYear(movie.release_date)}{movie.character ? ` · ${movie.character}` : ''}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="border-t border-ns-border pt-5 text-sm font-body text-ns-muted">
            No movie credits are available for this actor yet.
          </p>
        )}
      </Section>
    </div>
  )
}
