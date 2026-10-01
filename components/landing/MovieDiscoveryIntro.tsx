import Link from 'next/link'
import Section from '@/components/ui/Section'

const features = [
  {
    title: 'Find a movie for tonight',
    copy: 'Browse trending movies, acclaimed classics, and hidden gems. Compare genre, runtime, ratings, and audience fit before you press play.',
    href: '/discover',
    label: 'Discover movies',
  },
  {
    title: 'Recommendations shaped by your taste',
    copy: 'Rate films you have seen to build your Movie DNA. Save the movies that interest you and use your taste profile to find your next watch.',
    href: '/movie-recommendations',
    label: 'Explore movie recommendations',
  },
  {
    title: 'Choose how much you reveal',
    copy: 'Movie pages start in Safe mode with cast and trailers covered. Switch to Blind mode to hide the premise, or Standard when you want more detail.',
    href: '/discover',
    label: 'Browse with spoiler controls',
  },
]

export default function MovieDiscoveryIntro() {
  return (
    <div className="min-w-0 px-4 py-14 sm:px-6 sm:py-20">
      <Section
        headingId="movie-discovery-heading"
        title="SPOILER-FREE MOVIE RECOMMENDATIONS"
        note={
          <>
            NoSpoilers helps you decide what movie to watch while keeping the story a discovery.
            Explore films on your own, then create an account to build a watchlist and get personal recommendations.
          </>
        }
        className="mx-auto w-full max-w-6xl"
      >
        <div>
          {features.map(feature => (
            <article
              key={feature.title}
              className="grid gap-x-10 gap-y-2 border-t border-ns-border py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"
            >
              <h3 className="font-heading text-lg font-semibold text-ns-text">{feature.title}</h3>
              <div className="min-w-0">
                <p className="text-sm leading-7 text-ns-muted">{feature.copy}</p>
                <Link
                  href={feature.href}
                  className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text"
                >
                  {feature.label}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Section>
    </div>
  )
}
