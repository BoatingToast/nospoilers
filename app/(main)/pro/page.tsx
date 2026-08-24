import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ProWaitlistForm from '@/components/pro/ProWaitlistForm'

export const metadata: Metadata = {
  title: 'NoSpoilers Pro — Coming Soon',
  description: 'Join the waitlist for NoSpoilers Pro, planned at $4.99 per month.',
}

const PLANNED_AREAS = [
  {
    number: '01',
    title: 'Smarter discovery',
    description: 'More control over recommendations, moods, and the movies you want to find next.',
  },
  {
    number: '02',
    title: 'Stronger spoiler protection',
    description: 'More ways to tune what gets hidden while you browse, watch, and talk about movies.',
  },
  {
    number: '03',
    title: 'Deeper taste insights',
    description: 'A richer view of how your Movie DNA changes as you rate, review, and discover films.',
  },
]

export default async function ProPage() {
  const session = await getServerSession(authOptions)
  const initialEmail = session?.user?.email ?? ''

  return (
    <div className="relative isolate overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-ns-secondary/15 blur-[120px]"
      />

      <div className="mx-auto max-w-5xl">
        <section className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-ns-secondary/30 bg-ns-secondary/10 px-3 py-1 text-[11px] font-heading font-semibold uppercase tracking-[0.2em] text-ns-secondary-readable">
            <span className="h-1.5 w-1.5 rounded-full bg-ns-secondary-readable" />
            Coming soon
          </span>

          <p className="mt-8 font-display text-2xl tracking-[0.24em] text-ns-secondary-readable">
            NOSPOILERS PRO
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            More movie magic.
            <span className="block text-ns-muted">Still zero spoilers.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-ns-muted sm:text-lg">
            We’re shaping a premium NoSpoilers experience for people who want more control over discovery and spoiler protection. Join early and help us decide what ships first.
          </p>

          <div className="mt-9 flex items-end justify-center gap-2" aria-label="$4.99 per month at launch">
            <span className="font-heading text-5xl font-semibold text-white">$4.99</span>
            <span className="pb-1.5 text-sm text-ns-muted">/ month at launch</span>
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ns-muted/70">
            No commitment · Nothing to pay today
          </p>

          <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-ns-border bg-ns-surface/85 p-5 text-left shadow-2xl shadow-ns-secondary/10 backdrop-blur sm:p-7">
            <div className="mb-5">
              <h2 className="font-heading text-xl font-semibold text-white">Be first in line</h2>
              <p className="mt-1 text-sm leading-6 text-ns-muted">
                Get the launch date, final feature list, and an invitation when Pro is ready.
              </p>
            </div>
            <ProWaitlistForm initialEmail={initialEmail} signedIn={Boolean(session)} />
          </div>
        </section>

        <section className="mt-20" aria-labelledby="planned-for-pro">
          <div className="text-center">
            <p className="text-xs font-heading font-semibold uppercase tracking-[0.2em] text-ns-secondary-readable">
              In development
            </p>
            <h2 id="planned-for-pro" className="mt-3 font-heading text-3xl font-semibold text-white">
              What we’re exploring for Pro
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-ns-muted">
              These are planned directions, not locked promises. Waitlist members will help shape the final release.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PLANNED_AREAS.map(area => (
              <article
                key={area.number}
                className="rounded-2xl border border-ns-border bg-ns-surface/65 p-6 transition-colors hover:border-ns-secondary/35"
              >
                <span className="font-display text-2xl tracking-widest text-ns-secondary-readable/70">
                  {area.number}
                </span>
                <h3 className="mt-5 font-heading text-lg font-semibold text-white">{area.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ns-muted">{area.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
