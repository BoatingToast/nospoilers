import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import JsonLd from '@/components/seo/JsonLd'
import PosterImage from '@/components/discover/PosterImage'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import { StarIcon } from '@/components/icons'
import { getMovieGuide, guidePath, type MovieGuide } from '@/lib/movie-guides'
import { PRO_GENRE_NAMES } from '@/lib/pro-features'
import { absoluteUrl, publicPageMetadata } from '@/lib/seo'
import { formatYear } from '@/lib/utils'
import { getGuideMovies } from '@/services/movie-guides'

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 86_400

// Guides render on their first request and are then cached for a day, so a
// build without TMDb access still succeeds. An empty list enables that runtime
// ISR; unknown slugs are rejected by the page itself.
export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getMovieGuide((await params).slug)
  if (!guide) notFound()
  return publicPageMetadata({ title: guide.title, description: guide.description, path: guidePath(guide) })
}

const linkClass = 'font-semibold text-ns-text underline decoration-ns-border-strong underline-offset-4 transition-colors hover:decoration-ns-text'

function relatedGuides(guide: MovieGuide): MovieGuide[] {
  return guide.related.map(getMovieGuide).filter((item): item is MovieGuide => Boolean(item))
}

export default async function MovieGuidePage({ params }: Props) {
  const guide = getMovieGuide((await params).slug)
  if (!guide) notFound()

  const movies = await getGuideMovies(guide)
  const url = absoluteUrl(guidePath(guide))

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6 lg:pb-24">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            // A summary page listing our own movie pages, which carry the
            // Movie markup. This is the shape Google's movie carousel reads.
            '@type': 'ItemList',
            '@id': `${url}#list`,
            name: guide.heading,
            numberOfItems: movies.length,
            itemListElement: movies.map((movie, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: absoluteUrl(`/movie/${movie.id}`),
            })),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'NoSpoilers', item: absoluteUrl('/') },
              { '@type': 'ListItem', position: 2, name: 'Movie recommendations', item: absoluteUrl('/movie-recommendations') },
              { '@type': 'ListItem', position: 3, name: guide.label, item: url },
            ],
          },
        ],
      }} />

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ns-muted sm:mb-6">
        <ol className="flex min-w-0 flex-wrap items-center gap-x-2">
          <li><Link href="/" className="inline-flex min-h-11 items-center transition-colors hover:text-ns-text">NoSpoilers</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/movie-recommendations" className="inline-flex min-h-11 items-center transition-colors hover:text-ns-text">Movie recommendations</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="min-w-0 truncate text-ns-text">{guide.label}</li>
        </ol>
      </nav>

      <PageHeader title={guide.heading} description={guide.intro[0]} />
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ns-muted">{guide.intro[1]}</p>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ns-subtle">{guide.method}</p>

      <ol className="mt-10 grid gap-x-12 lg:mt-14 lg:grid-cols-2">
        {movies.map((movie, index) => {
          const genres = (movie.genre_ids ?? []).map(id => PRO_GENRE_NAMES[id]).filter(Boolean).slice(0, 3)
          return (
            <li key={movie.id} className="border-t border-ns-border">
              <Link href={`/movie/${movie.id}`} className="group flex items-center gap-4 py-4 sm:gap-5">
                <span className="w-9 flex-shrink-0 text-right font-display text-3xl tabular-nums text-ns-subtle">
                  {index + 1}
                </span>
                <span className="relative aspect-[2/3] w-16 flex-shrink-0 overflow-hidden rounded-xl bg-ns-surface ring-1 ring-inset ring-white/5 sm:w-20">
                  <PosterImage
                    path={movie.poster_path}
                    size="w185"
                    sizes="80px"
                    preload={index < 2}
                    className="transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                  />
                </span>
                <div className="min-w-0">
                  <h2 className="font-heading text-lg font-semibold leading-snug text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable sm:text-xl">
                    {movie.title}
                  </h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm tabular-nums text-ns-muted">
                    <span>{formatYear(movie.release_date)}</span>
                    {movie.vote_average > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <StarIcon size={13} className="text-ns-secondary-readable" />
                          {movie.vote_average.toFixed(1)}
                          <span className="sr-only"> TMDb audience score</span>
                        </span>
                      </>
                    )}
                  </p>
                  {genres.length > 0 && <p className="mt-1 text-sm text-ns-subtle">{genres.join(', ')}</p>}
                </div>
              </Link>
            </li>
          )
        })}
      </ol>

      <section
        aria-labelledby="guide-spoiler-tip"
        className="ns-reveal mt-14 grid gap-6 rounded-3xl bg-ns-surface p-7 sm:p-10 lg:mt-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:p-14"
      >
        <h2 id="guide-spoiler-tip" className="font-display text-3xl text-ns-text sm:text-4xl">
          Keep it spoiler-free.
        </h2>
        <div className="max-w-2xl text-base leading-relaxed text-ns-muted">
          <p className="text-lg">{guide.spoilerTip}</p>
          <p className="mt-4">
            Every movie page starts in Safe mode with cast and trailers covered. Switch to Blind mode to hide the premise too.{' '}
            <Link href="/register" className={linkClass}>Build your Movie DNA</Link>{' '}
            to get recommendations shaped by the films you rate.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="guide-questions"
        className="mt-14 grid gap-8 lg:mt-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-14"
      >
        <h2 id="guide-questions" className="ns-reveal font-display text-3xl text-ns-text sm:text-4xl">
          Questions
        </h2>
        <div className="divide-y divide-ns-border">
          {guide.questions.map((item, index) => (
            <div key={item.question} className="ns-reveal py-6 first:pt-0" style={{ '--i': index } as React.CSSProperties}>
              <h3 className="font-heading text-xl font-bold text-ns-text">{item.question}</h3>
              <p className="mt-2 text-base leading-relaxed text-ns-muted">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <nav aria-labelledby="more-guides" className="ns-reveal mt-14 lg:mt-20 lg:px-14">
        <h2 id="more-guides" className="font-display text-3xl text-ns-text sm:text-4xl">More movie guides</h2>
        <ul className="mt-6 flex flex-wrap gap-2.5">
          {relatedGuides(guide).map(item => (
            <li key={item.slug}>
              <Button href={guidePath(item)} variant="secondary">{item.label}</Button>
            </li>
          ))}
          <li>
            <Button href="/movie-recommendations" variant="outline">All movie recommendations</Button>
          </li>
        </ul>
      </nav>
    </div>
  )
}
