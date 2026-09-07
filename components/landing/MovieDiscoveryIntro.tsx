import Link from 'next/link'

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
    <section aria-labelledby="movie-discovery-heading" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-ns-secondary-readable">Your next watch starts here</p>
        <h2 id="movie-discovery-heading" className="max-w-3xl font-display text-4xl tracking-wide sm:text-5xl">
          SPOILER-FREE MOVIE RECOMMENDATIONS
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-ns-muted sm:text-base">
          NoSpoilers helps you decide what movie to watch while keeping the story a discovery.
          Explore films on your own, then create an account to build a watchlist and get personal recommendations.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map(feature => (
            <article key={feature.title} className="flex flex-col rounded-2xl border border-ns-border bg-ns-surface/40 p-6">
              <h3 className="font-heading text-lg font-semibold">{feature.title}</h3>
              <p className="mb-6 mt-3 flex-1 text-sm leading-7 text-ns-muted">{feature.copy}</p>
              <Link href={feature.href} className="text-sm font-semibold text-ns-secondary-readable underline-offset-4 hover:underline">
                {feature.label} <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
