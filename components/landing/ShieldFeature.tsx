'use client'

import { useSession } from 'next-auth/react'
import Button from '@/components/ui/Button'
import { EyeOffIcon, LockIcon, SpoilerFreeIcon } from '@/components/icons'

const FEATURES = [
  {
    title: 'Covers spoilers in live feeds.',
    copy: 'Shield checks new posts, headlines, and search results as they appear, then hides risky blocks until you reveal them.',
    Icon: EyeOffIcon,
  },
  {
    title: 'Syncs your Plot Passport.',
    copy: 'Send every unfinished movie from NoSpoilers to Chrome in one click while keeping your manually protected titles intact.',
    Icon: SpoilerFreeIcon,
  },
  {
    title: 'Keeps page content private.',
    copy: 'Classification happens on your device. The pages you browse are never uploaded to NoSpoilers.',
    Icon: LockIcon,
  },
]

function HiddenPost({ source, title }: { source: string; title: string }) {
  return (
    <article className="border-b border-ns-border p-5 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-ns-text">{source}</p>
        <p className="text-xs text-ns-muted">Just now</p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ns-muted">
        This post mentions <span className="font-semibold text-ns-text">{title}</span> with spoiler-like language.
      </p>
      <p aria-hidden="true" className="mt-3 text-sm leading-7">
        <span className="ns-redact">The ending of this film turns on a single reveal that</span>{' '}
        <span className="ns-redact">nobody in the audience saw coming.</span>
      </p>
      <p className="mt-3 text-xs font-semibold text-ns-secondary-readable">Potential spoiler hidden. Reveal only when ready.</p>
    </article>
  )
}

export default function ShieldFeature() {
  const { status } = useSession()
  const passportHref = status === 'authenticated' ? '/plot-passport' : '/register'
  const passportLabel = status === 'authenticated' ? 'Open Plot Passport' : 'Build my protection list'

  return (
    <section id="shield" aria-labelledby="shield-title" className="px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-[77rem]">
        <div className="ns-reveal grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-16">
          <div>
            <h2 id="shield-title" className="font-display text-4xl text-ns-text sm:text-5xl lg:text-6xl">
              The web can&apos;t warn you. Shield can.
            </h2>
          </div>
          <p className="text-lg leading-relaxed text-ns-muted">
            NoSpoilers Shield is a Chrome extension, now in beta. Protect the movies and shows you have not finished yet. Shield covers likely spoilers across social feeds, video sites, search results, and news pages until you choose to look.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-16">
          <div className="ns-scroll-expand rounded-3xl bg-ns-tile-peach p-4 sm:p-8">
            <div className="overflow-hidden rounded-2xl bg-ns-surface shadow-xl">
              <div className="flex items-center justify-between gap-3 border-b border-ns-border p-5">
                <div>
                  <p className="font-heading text-lg font-bold text-ns-text">Your feed</p>
                  <p className="text-xs text-ns-muted">Shield is actively checking new posts</p>
                </div>
                <span className="flex-shrink-0 rounded-full bg-ns-success/10 px-2.5 py-1 text-xs font-semibold text-ns-success">Protection on</span>
              </div>

              <HiddenPost source="MovieTalk" title="The Odyssey" />
              <HiddenPost source="Film Weekly" title="Spider-Man: Brand New Day" />

              <div className="flex flex-wrap items-center gap-2 border-t border-ns-border p-4">
                <span className="text-xs font-medium text-ns-muted">Plot Passport</span>
                {['The Odyssey', 'Project Hail Mary', 'Disclosure Day'].map(title => (
                  <span key={title} className="rounded-full bg-ns-surface-2 px-2.5 py-1 text-xs font-medium text-ns-text">{title}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <ul>
              {FEATURES.map(({ title, copy, Icon }, index) => (
                <li
                  key={title}
                  className="ns-reveal flex gap-4 border-t border-ns-border py-6"
                  style={{ '--i': index } as React.CSSProperties}
                >
                  <Icon size={22} className="mt-0.5 flex-shrink-0 text-ns-muted" />
                  <div>
                    <h3 className="font-heading text-xl font-bold text-ns-text">{title}</h3>
                    <p className="mt-1.5 text-base leading-relaxed text-ns-muted">{copy}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 border-t border-ns-border pt-6 sm:flex-row">
              <Button size="lg" href={passportHref}>{passportLabel}</Button>
              <Button size="lg" variant="secondary" href="/privacy/extension">See how privacy works</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
