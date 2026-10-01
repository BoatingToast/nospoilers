import Link from 'next/link'
import { publicPageMetadata } from '@/lib/seo'

export const metadata = publicPageMetadata({
  title: 'Movie Recommendations — Find Your Next Watch',
  description: 'What movie should you watch? Find spoiler-free movie recommendations by taste, genre, and mood. Explore Movie DNA, similar films, and watchlists on NoSpoilers.',
  path: '/movie-recommendations',
})

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

export default function MovieRecommendationsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
      <header className="max-w-3xl">
        <p className="mb-4 text-xs uppercase tracking-[0.2em] text-ns-secondary-readable">NoSpoilers movie guide</p>
        <h1 className="font-display text-5xl leading-none tracking-wide sm:text-7xl">MOVIE RECOMMENDATIONS WITHOUT SPOILERS</h1>
        <p className="mt-6 text-lg leading-8 text-ns-muted">
          What movie should you watch tonight? Start with what you enjoy, how much time you have,
          and how much you want to know before the opening scene. NoSpoilers helps you compare
          films without needing to read a full plot summary.
        </p>
        <Link href="/discover" className="mt-8 inline-flex rounded-xl bg-ns-secondary px-6 py-3 text-sm font-semibold text-ns-secondary-foreground hover:bg-ns-secondary/85">
          Find your next movie
        </Link>
      </header>

      <section aria-labelledby="choose-a-movie" className="mt-16">
        <h2 id="choose-a-movie" className="font-display text-3xl tracking-wide sm:text-4xl">HOW TO FIND A MOVIE YOU WILL ENJOY</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-ns-border bg-ns-surface/40 p-6">
              <p className="mb-4 text-xs tracking-widest text-ns-secondary-readable">0{index + 1}</p>
              <h3 className="font-heading text-lg font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-ns-muted">{step.text}</p>
              <Link href={step.href} className="mt-5 inline-block text-sm font-semibold text-ns-secondary-readable underline-offset-4 hover:underline">{step.link} →</Link>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="recommendation-questions" className="mt-16">
        <h2 id="recommendation-questions" className="font-display text-3xl tracking-wide sm:text-4xl">QUESTIONS ABOUT FINDING YOUR NEXT WATCH</h2>
        <div className="mt-6 divide-y divide-ns-border">
          {questions.map(item => (
            <div key={item.question} className="py-6">
              <h3 className="font-heading text-lg font-semibold">{item.question}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-ns-muted">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
