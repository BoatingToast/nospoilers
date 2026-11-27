import Link from 'next/link'
import Button from '@/components/ui/Button'
import DiscoverSection from '@/components/discover/DiscoverSection'
import JsonLd from '@/components/seo/JsonLd'
import { guidePath, MOVIE_GUIDES } from '@/lib/movie-guides'
import { curateDistinctMovieShelf } from '@/lib/movie-quality'
import { absoluteUrl, publicPageMetadata } from '@/lib/seo'
import { getTrendingMovies } from '@/services/tmdb'
import type { TMDbMovie } from '@/types'

export const metadata = publicPageMetadata({
  title: 'Movie Recommendations — Find Your Next Watch',
  description: 'What movie should you watch? Find spoiler-free movie recommendations by taste, genre, and mood. Explore Movie DNA, similar films, and watchlists on NoSpoilers.',
  path: '/movie-recommendations',
})

export const revalidate = 3600

const guideGroups = [
  { id: 'genre-guides', title: 'By genre', guides: MOVIE_GUIDES.filter(guide => guide.group === 'genre') },
  { id: 'occasion-guides', title: 'By time and mood', guides: MOVIE_GUIDES.filter(guide => guide.group === 'occasion') },
]

// The guides carry the page if the catalog is unavailable, so a failed feed
// hides this shelf rather than failing the page.
async function getWeeklyPicks(): Promise<TMDbMovie[]> {
  try {
    const { results } = await getTrendingMovies('week')
    return curateDistinctMovieShelf(results, new Set(), { limit: 12, minVoteCount: 200, minRating: 6.5 })
  } catch (error) {
    console.error('[movie-recommendations] weekly picks unavailable', error)
    return []
  }
}

const steps = [
  {
    title: 'Start with a movie you already love',
    text: 'Search for a favorite film and open its movie page. Compare its vibe and audience profile, then explore similar movies. This is a useful starting point when you want a familiar feeling without watching the same film again.',
    href: '/search',
    link: 'Search movies and people',
  },
  {
    title: 'Choose the kind of evening you want',
    text: 'Use Discover to browse drama, thriller, science fiction, and comedy alongside trending titles, new releases, and highly rated films. Check runtime before committing, and use the vibe profile to compare the mood and energy of a movie.',
    href: '/discover',
    link: 'Browse movies to watch',
  },
  {
    title: 'Build recommendations from your ratings',
    text: 'Create an account and rate movies you have seen. Your Movie DNA reflects patterns in your taste, and your ratings help shape personalized recommendations. Rate both favorites and films that did not work for you so your profile has a broader picture.',
    href: '/register',
    link: 'Build your Movie DNA',
  },
  {
    title: 'Keep a shortlist for movie night',
    text: 'Save interesting films to your watchlist as you browse. When it is time to choose, you have a list of movies you already want to see. Signed-in members can also use the Movie Night Picker to plan with friends using shared taste signals.',
    href: '/movie-night',
    link: 'Plan a movie night',
  },
]

const questions = [
  {
    question: 'Can I browse movies without an account?',
    answer: 'Yes. Discover, search, and individual movie pages are public. Create an account to save a watchlist, rate films, and build personalized recommendations.',
  },
  {
    question: 'How do the spoiler controls work?',
    answer: 'Movie pages start in Safe mode, which shows an automatically shortened premise while keeping cast and trailers hidden. Blind mode hides the premise too. Standard mode reveals the full synopsis, cast, and available trailers. Automatically shortened text can still contain spoilers, so choose Blind mode when you want to know as little as possible.',
  },
  {
    question: 'What is Movie DNA?',
    answer: 'Movie DNA is your movie taste profile. It uses the films you rate to describe patterns in what you enjoy and support personalized recommendations. Adding more ratings gives the profile more evidence to work with.',
  },
  {
    question: 'Does NoSpoilers show where a movie is available?',
    answer: 'Movie pages show viewing options when provider information is available for your region. Availability varies by film and country; check the provider for current access and pricing.',
  },
]

export default async function MovieRecommendationsPage() {
  const picks = await getWeeklyPicks()

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:pb-24">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'NoSpoilers', item: absoluteUrl('/') },
              { '@type': 'ListItem', position: 2, name: 'Movie recommendations', item: absoluteUrl('/movie-recommendations') },
            ],
          },
          ...(picks.length > 0 ? [{
            '@type': 'ItemList',
            name: 'Popular picks this week',
            numberOfItems: picks.length,
            itemListElement: picks.map((movie, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: absoluteUrl(`/movie/${movie.id}`),
            })),
          }] : []),
        ],
      }} />
      <header className="max-w-4xl">
        <h1 className="font-display text-5xl text-ns-text sm:text-6xl lg:text-7xl">
          Movie recommendations without spoilers
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ns-muted">
          What movie should you watch tonight? Start with what you enjoy, how much time you have,
          and how much you want to know before the opening scene. NoSpoilers helps you compare
          films without needing to read a full plot summary.
        </p>
        <Button href="/discover" size="lg" className="mt-8 w-full sm:w-auto">
          Find your next movie
        </Button>
      </header>

      <section aria-labelledby="browse-guides" className="mt-14 lg:mt-20">
        <h2 id="browse-guides" className="font-display text-4xl text-ns-text sm:text-5xl">
          Browse movie recommendations
        </h2>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ns-muted">
          Each list is ranked by audience score and refreshed daily. None of them include a plot summary.
        </p>
        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
          {guideGroups.map(group => (
            <div key={group.id}>
              <h3 id={group.id} className="font-heading text-xl font-bold text-ns-text">{group.title}</h3>
              <ul aria-labelledby={group.id} className="mt-3 divide-y divide-ns-border">
                {group.guides.map(guide => (
                  <li key={guide.slug}>
                    <Link
                      href={guidePath(guide)}
                      className="group flex min-h-12 items-center justify-between gap-4 py-2 text-base font-semibold text-ns-text transition-colors hover:text-ns-secondary-readable"
                    >
                      {guide.label}
                      <span aria-hidden="true" className="text-ns-subtle transition-colors group-hover:text-ns-secondary-readable">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {picks.length > 0 && (
        <div className="mt-14 lg:mt-20">
          <DiscoverSection
            title="Popular picks this week"
            description="Trending films with strong audience scores."
            movies={picks}
          />
        </div>
      )}

      <section
        aria-labelledby="choose-a-movie"
        className="mt-14 grid gap-8 rounded-3xl bg-ns-surface p-7 sm:p-10 lg:mt-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:p-14"
      >
        <h2 id="choose-a-movie" className="ns-reveal font-display text-4xl text-ns-text sm:text-5xl lg:sticky lg:top-24 lg:self-start">
          How to find a movie you will enjoy
        </h2>
        <ol className="divide-y divide-ns-border">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="ns-reveal py-7 first:pt-0 last:pb-0"
              style={{ '--i': index } as React.CSSProperties}
            >
              <h3 className="font-heading text-2xl font-bold text-ns-text">{step.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-ns-muted">{step.text}</p>
              <Link
                href={step.href}
                className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-ns-text underline decoration-ns-border-strong underline-offset-4 transition-colors hover:decoration-ns-text"
              >
                {step.link} <span aria-hidden="true" className="ml-1">→</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="recommendation-questions"
        className="mt-14 grid gap-8 lg:mt-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-14"
      >
        <h2 id="recommendation-questions" className="ns-reveal font-display text-4xl text-ns-text sm:text-5xl lg:sticky lg:top-24 lg:self-start">
          Questions about finding your next watch
        </h2>
        <div className="divide-y divide-ns-border">
          {questions.map((item, index) => (
            <div key={item.question} className="ns-reveal py-6 first:pt-0" style={{ '--i': index } as React.CSSProperties}>
              <h3 className="font-heading text-xl font-bold text-ns-text">{item.question}</h3>
              <p className="mt-2 text-base leading-relaxed text-ns-muted">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
