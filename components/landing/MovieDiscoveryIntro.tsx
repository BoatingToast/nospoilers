import Link from 'next/link'

const features = [
  {
    title: 'Find a movie for tonight.',
    copy: 'Browse trending movies, acclaimed classics, and hidden gems. Compare genre, runtime, ratings, and audience fit before you press play.',
    href: '/discover',
    label: 'Discover movies',
  },
  {
    title: 'Recommendations shaped by your taste.',
    copy: 'Rate films you have seen to build your Movie DNA. Save the movies that interest you and use your taste profile to find your next watch.',
    href: '/movie-recommendations',
    label: 'Explore movie recommendations',
  },
  {
    title: 'Choose how much you reveal.',
    copy: 'Movie pages start in Safe mode with cast and trailers covered. Switch to Blind mode to hide the premise, or Standard when you want more detail.',
    href: '/discover',
    label: 'Browse with spoiler controls',
  },
]

export default function MovieDiscoveryIntro() {
  return (
    <section aria-labelledby="movie-discovery-heading" className="px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto grid max-w-[77rem] gap-10 rounded-3xl bg-ns-surface p-7 sm:p-10 lg:grid-cols-2 lg:gap-16 lg:p-14">
        <div className="ns-reveal">
          <h2 id="movie-discovery-heading" className="font-display text-4xl text-ns-text sm:text-5xl lg:text-6xl">
            Spoiler-free movie recommendations.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ns-muted">
            NoSpoilers helps you decide what movie to watch while keeping the story a discovery.
            Explore films on your own, then create an account to build a watchlist and get personal recommendations.
          </p>
        </div>

        <div className="divide-y divide-ns-border">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="ns-reveal py-6 first:pt-0 last:pb-0"
              style={{ '--i': index + 1 } as React.CSSProperties}
            >
              <h3 className="font-heading text-2xl font-bold text-ns-text">{feature.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-ns-muted">{feature.copy}</p>
              <Link
                href={feature.href}
                className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-ns-text underline decoration-ns-border-strong underline-offset-4 hover:decoration-ns-text"
              >
                {feature.label} <span aria-hidden="true" className="ml-1">→</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
