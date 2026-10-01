import Link from 'next/link'
import { publicPageMetadata } from '@/lib/seo'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import Section from '@/components/ui/Section'

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
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <PageHeader
        title="MOVIE RECOMMENDATIONS "
        accent="WITHOUT SPOILERS"
        lede={
          <>
            What movie should you watch tonight? Start with what you enjoy, how much time you have,
            and how much you want to know before the opening scene. NoSpoilers helps you compare
            films without needing to read a full plot summary.
          </>
        }
      >
        <Button variant="primary" size="lg" href="/discover" className="w-full sm:w-auto">
          Find your next movie
        </Button>
      </PageHeader>

      <Section headingId="choose-a-movie" title="HOW TO FIND A MOVIE YOU WILL ENJOY" className="mt-14">
        <ol>
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="grid gap-x-10 gap-y-2 border-t border-ns-border py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"
            >
              <h3 className="flex gap-3 font-heading text-lg font-semibold text-ns-text">
                <span className="text-ns-secondary-readable" aria-hidden="true">0{index + 1}</span>
                <span className="min-w-0">{step.title}</span>
              </h3>
              <div className="min-w-0">
                <p className="text-sm leading-7 text-ns-muted">{step.text}</p>
                <Link
                  href={step.href}
                  className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text"
                >
                  {step.link}
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section headingId="recommendation-questions" title="QUESTIONS ABOUT FINDING YOUR NEXT WATCH" className="mt-14">
        <div>
          {questions.map(item => (
            <div
              key={item.question}
              className="grid gap-x-10 gap-y-2 border-t border-ns-border py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"
            >
              <h3 className="font-heading text-lg font-semibold text-ns-text">{item.question}</h3>
              <p className="text-sm leading-7 text-ns-muted">{item.answer}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
