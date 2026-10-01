'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'

const FEATURES = [
  {
    title: 'Covers spoilers in live feeds',
    copy: 'Shield checks new posts, headlines, and search results as they appear, then hides risky blocks until you reveal them.',
  },
  {
    title: 'Syncs your Plot Passport',
    copy: 'Send every unfinished movie from NoSpoilers to Chrome in one click while keeping your manually protected titles intact.',
  },
  {
    title: 'Keeps page content private',
    copy: 'Classification happens on your device. The pages you browse are never uploaded to NoSpoilers.',
  },
]

function HiddenPost({ source, title }: { source: string; title: string }) {
  return (
    <div className="border-t border-ns-border py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-heading text-xs font-semibold text-ns-text">
          {source} <span className="font-body font-normal text-ns-muted">· Just now</span>
        </p>
        <Badge variant="secondary">Protected</Badge>
      </div>
      <p className="mt-3 font-heading text-sm font-semibold text-ns-text">Potential spoiler hidden</p>
      <p className="mt-1 font-body text-xs leading-relaxed text-ns-muted">
        This post mentions <span className="text-ns-text">{title}</span> with spoiler-like language.
      </p>
      <p className="mt-2 font-body text-xs font-semibold text-ns-secondary-readable">Reveal only when ready</p>
    </div>
  )
}

export default function ShieldFeature() {
  const { status } = useSession()
  const passportHref = status === 'authenticated' ? '/plot-passport' : '/register'
  const passportLabel = status === 'authenticated' ? 'Open Plot Passport' : 'Build my protection list'

  return (
    <div className="min-w-0 border-y border-ns-border px-4 py-14 sm:px-6 sm:py-20">
      <Section
        id="shield"
        headingId="shield-title"
        title="THE WEB CAN'T WARN YOU. SHIELD CAN."
        note="Protect the movies and shows you have not finished yet. NoSpoilers Shield covers likely spoilers across social feeds, video sites, search results, and news pages until you choose to look."
        action={<Badge variant="secondary" size="md">Chrome extension beta</Badge>}
        className="mx-auto w-full max-w-6xl scroll-mt-20"
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            {FEATURES.map(({ title, copy }) => (
              <div
                key={title}
                className="grid gap-x-8 gap-y-1 border-t border-ns-border py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"
              >
                <h3 className="font-heading text-base font-semibold text-ns-text">{title}</h3>
                <p className="font-body text-sm leading-relaxed text-ns-muted">{copy}</p>
              </div>
            ))}

            <div className="flex flex-col gap-3 border-t border-ns-border pt-6 sm:flex-row sm:items-center sm:gap-6">
              <Button variant="secondary" size="lg" href={passportHref} className="w-full sm:w-auto">
                {passportLabel}
              </Button>
              <Link
                href="/privacy/extension"
                className="inline-flex min-h-10 items-center font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text"
              >
                See how privacy works
              </Link>
            </div>
          </div>

          {/* Example of a protected feed, as Shield shows it. */}
          <div className="min-w-0 border-t-2 border-ns-text pt-4">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div className="min-w-0">
                <p className="font-heading text-sm font-semibold text-ns-text">Your feed</p>
                <p className="mt-0.5 font-body text-xs text-ns-muted">Shield is actively checking new posts</p>
              </div>
              <Badge variant="success">Protection on</Badge>
            </div>

            <HiddenPost source="MovieTalk" title="The Odyssey" />
            <HiddenPost source="Film Weekly" title="Spider-Man: Brand New Day" />

            <p className="border-t border-ns-border pt-4 font-body text-xs leading-relaxed text-ns-muted">
              <span className="font-semibold text-ns-text">Plot Passport</span>
              {' · '}
              {['The Odyssey', 'Project Hail Mary', 'Disclosure Day'].join(' · ')}
            </p>
          </div>
        </div>
      </Section>
    </div>
  )
}
